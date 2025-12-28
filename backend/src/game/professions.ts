export interface Profession {
    name: string;
    salary: number;
    savings: number; // Starting cash
    perChildCost: number;
    expenses: number; // Base expenses (taxes + other fixed costs)

    // Detailed Expenses & Liabilities (Optional for backward compatibility or defaults)
    taxes?: number;
    otherExpenses?: number;
    carLoan?: { cost: number; payment: number };
    creditCard?: { cost: number; payment: number };
    schoolLoan?: { cost: number; payment: number };
    mortgage?: { cost: number; payment: number };
    retailDebt?: { cost: number; payment: number };
}

export const PROFESSIONS: Profession[] = [
    {
        name: 'Entrepreneur',
        salary: 10000,
        savings: 2000,
        perChildCost: 400,
        expenses: 6200,
        taxes: 1300,
        otherExpenses: 1500,
        carLoan: { cost: 14000, payment: 700 },
        creditCard: { cost: 20000, payment: 1000 },
        schoolLoan: { cost: 10000, payment: 500 },
        mortgage: { cost: 240000, payment: 1200 },
        retailDebt: { cost: 0, payment: 0 } // Explicitly 0 if not listed
    }
];
