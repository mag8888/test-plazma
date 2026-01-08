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
        name: 'Manager',
        salary: 10000,
        savings: 2000,
        perChildCost: 500,
        expenses: 5800,
        taxes: 1200,
        otherExpenses: 1200,
        carLoan: { cost: 14000, payment: 700 },
        creditCard: { cost: 20000, payment: 1000 },
        schoolLoan: { cost: 10000, payment: 500 },
        mortgage: { cost: 240000, payment: 1200 },
        retailDebt: { cost: 0, payment: 0 }
    },
    {
        name: 'Entrepreneur',
        salary: 0,
        savings: 250000,
        perChildCost: 500,
        expenses: 5800,
        taxes: 1200, // Taxes might need to be 0 or dynamic if salary is 0? User said "such expenses". Taxes usually % of income. But let's keep fixed if user said "same expenses". But 1200 tax on 0 income is harsh.
        // User request: "no salary but same expenses".
        // I will keep expenses identical for now.
        otherExpenses: 1200,
        carLoan: { cost: 14000, payment: 700 },
        creditCard: { cost: 20000, payment: 1000 },
        schoolLoan: { cost: 10000, payment: 500 },
        mortgage: { cost: 240000, payment: 1200 },
        retailDebt: { cost: 0, payment: 0 }
    }
];
