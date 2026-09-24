import { Head, Link, usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';
import { Briefcase, Clock, FileText, Gavel, Receipt, Scale, ShieldCheck, Users } from 'lucide-react';

const FEATURES = [
    { icon: Briefcase, title: 'Case management', body: 'Every matter with its court, judge, opposing side, priority and full history in one file.' },
    { icon: Gavel, title: 'Hearing diary', body: 'Schedule hearings, track outcomes, and see what is coming before the week starts.' },
    { icon: Users, title: 'Client records', body: 'Contacts, companies and their matters, searchable from one place.' },
    { icon: Clock, title: 'Time tracking', body: 'Log billable minutes against a case at its agreed rate. Nothing walks out unbilled.' },
    { icon: Receipt, title: 'Invoicing', body: 'Turn unbilled time into an invoice in one step, then record payments against it.' },
    { icon: FileText, title: 'Documents', body: 'Case files stored per matter with confidentiality levels, served only to signed-in staff.' },
];

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Advocate — legal practice management">
                <meta name="description" content="Case, client, hearing, time and billing management for law firms." />
            </Head>

            <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
                <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
                    <div className="flex items-center gap-2">
                        <Scale className="size-6" />
                        <span className="text-lg font-semibold tracking-tight">Advocate</span>
                    </div>
                    <nav className="flex items-center gap-2 text-sm">
                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white dark:bg-white dark:text-neutral-900"
                            >
                                Open dashboard
                            </Link>
                        ) : (
                            <>
                                <Link href={route('login')} className="rounded-md px-4 py-2 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900">
                                    Log in
                                </Link>
                                <Link
                                    href={route('register')}
                                    className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white dark:bg-white dark:text-neutral-900"
                                >
                                    Register
                                </Link>
                            </>
                        )}
                    </nav>
                </header>

                <main>
                    <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 text-center">
                        <p className="text-xs font-medium tracking-[0.2em] text-neutral-500 uppercase">Legal practice management</p>
                        <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                            Run the whole practice from one file per case.
                        </h1>
                        <p className="mx-auto mt-5 max-w-2xl text-lg text-pretty text-neutral-600 dark:text-neutral-400">
                            Cases, hearings, clients, tasks, billable time and invoices — kept together, so nothing is chased down by email
                            the night before a hearing.
                        </p>
                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <Link
                                href={auth.user ? route('dashboard') : route('login')}
                                className="rounded-md bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                            >
                                {auth.user ? 'Go to dashboard' : 'Sign in to your firm'}
                            </Link>
                            {!auth.user && (
                                <Link
                                    href={route('register')}
                                    className="rounded-md border border-neutral-300 px-6 py-3 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
                                >
                                    Create an account
                                </Link>
                            )}
                        </div>
                    </section>

                    <section className="border-y border-neutral-200 bg-neutral-50 py-16 dark:border-neutral-800 dark:bg-neutral-900/40">
                        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-3">
                            {FEATURES.map(({ icon: Icon, title, body }) => (
                                <div key={title} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                                    <Icon className="size-5 text-neutral-500" />
                                    <h2 className="mt-3 font-medium">{title}</h2>
                                    <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">{body}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="mx-auto max-w-6xl px-4 py-16">
                        <div className="flex flex-col items-center gap-3 text-center">
                            <ShieldCheck className="size-6 text-neutral-500" />
                            <h2 className="text-xl font-semibold">Client files stay on your server</h2>
                            <p className="max-w-xl text-sm text-neutral-600 dark:text-neutral-400">
                                Self-hosted. Documents are served through the application to signed-in staff only — never from a public URL.
                            </p>
                        </div>
                    </section>
                </main>

                <footer className="border-t border-neutral-200 py-6 text-center text-xs text-neutral-500 dark:border-neutral-800">
                    Advocate · legal practice management
                </footer>
            </div>
        </>
    );
}
