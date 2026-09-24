import { LegalBackdrop } from '@/components/legal-backdrop';
import { Link } from '@inertiajs/react';
import { Scale } from 'lucide-react';

interface AuthLayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
}

const MAXIM = {
    quote: 'Justice delayed is justice denied.',
    author: 'William Ewart Gladstone',
};

export default function AuthSplitLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="relative grid min-h-svh lg:grid-cols-2">
            <LegalBackdrop>
                <div className="flex h-full flex-col justify-between">
                    <Link href={route('home')} className="flex items-center gap-2 text-lg font-medium">
                        <Scale className="size-6" />
                        Advocate
                    </Link>
                    <blockquote className="max-w-md">
                        <p className="text-xl leading-relaxed text-balance">&ldquo;{MAXIM.quote}&rdquo;</p>
                        <footer className="mt-2 text-sm text-white/60">{MAXIM.author}</footer>
                    </blockquote>
                </div>
            </LegalBackdrop>

            <div className="flex items-center justify-center p-6 lg:p-10">
                <div className="w-full max-w-sm">
                    <Link href={route('home')} className="mb-8 flex items-center justify-center gap-2 text-lg font-medium lg:hidden">
                        <Scale className="size-6" />
                        Advocate
                    </Link>
                    <div className="mb-6 flex flex-col gap-1.5">
                        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                        {description && <p className="text-sm text-muted-foreground">{description}</p>}
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
