import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateExpenseCreateInput } from "@/lib/validations/expense.schema";
import { ExpenseService } from "@/lib/services/expense.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

const expenseService = new ExpenseService();

/**
 * GET /api/expenses
 * List expense claims with optional filtering
 */
export async function GET(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId") || undefined;
    const status = (searchParams.get("status") as any) || undefined;
    const category = (searchParams.get("category") as any) || undefined;

    const data = await expenseService.listExpenses(currentUser, { employeeId, status, category });
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("GET /api/expenses Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch expense claims." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/expenses
 * Submit new expense claim
 */
export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const validation = validateExpenseCreateInput(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await expenseService.submitExpense(validation.data, currentUser);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/expenses Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to submit expense claim." },
      { status: 500 }
    );
  }
}

