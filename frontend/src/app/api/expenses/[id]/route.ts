import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ExpenseService } from "@/lib/services/expense.service";
import { authService } from "@/lib/services/auth.service";

export const dynamic = "force-dynamic";

const expenseService = new ExpenseService();

/**
 * GET /api/expenses/[id]
 * Fetch single expense claim by ID
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const result = await expenseService.getExpenseById(params.id, currentUser);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error(`GET /api/expenses/${params.id} Error:`, err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch expense claim." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/expenses/[id]
 * Delete pending expense claim
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("ems-session")?.value;
    const currentUser = token ? await authService.getSessionUser(token) : null;

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const result = await expenseService.deleteExpense(params.id, currentUser);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(`DELETE /api/expenses/${params.id} Error:`, err);
    return NextResponse.json(
      { ok: false, error: "Failed to delete expense claim." },
      { status: 500 }
    );
  }
}

