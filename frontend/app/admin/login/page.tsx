import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/');
    }, [router]);

    return null;
}
                        >
    Назад
                        </button >
    <button
        onClick={handleLogin}
        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition"
    >
        Войти
    </button>
                    </div >
                </div >

    <div className="text-center text-xs text-slate-600">
        Только для администраторов MONEO
    </div>
            </div >
        </div >
    );
}
