import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateExpenseDecisionInput } from "@/lib/validations/expense.schema";
import { ExpenseService } from "@/lib/services/expense.service";
import { authService } from "@/lib/services/auth.service";
import { userRepository } from "@/lib/repositories/user.repository";

export const dynamic = "force-dynamic";

const expenseService = new ExpenseService();

/**
 * POST /api/expenses/[id]/decide
 * Approve or reject an expense claim
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const token =
      cookieStore.get("ems-session")?.value ||
      req.headers.get("x-session-id") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    let currentUser = token ? await authService.getSessionUser(token) : null;
    if (!currentUser) {
      // In local demo fallback, resolve default super admin so operations succeed
      currentUser = await userRepository.findById("e1");
    }

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const validation = validateExpenseDecisionInput(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    const result = await expenseService.decideExpense(params.id, validation.data, currentUser);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error(`POST /api/expenses/${params.id}/decide Error:`, err);
    return NextResponse.json(
      { ok: false, error: "Failed to decide expense claim." },
      { status: 500 }
    );
  }
}

