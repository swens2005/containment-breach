import type { ReactNode } from 'react';
import type { DashboardData } from '../../../packages/core/src/dashboard-data.ts';

export type Run = NonNullable<DashboardData['run']>;

/** The sample apps' names and pictures on the dashboard. */
export const SPECIMENS: Record<string, { name: string; image: string }> = {
    'support-bot': { name: 'Support bot', image: 'tank-support' },
    'email-agent': { name: 'Email agent', image: 'tank-email' },
    'doc-summarizer': { name: 'Document summarizer', image: 'tank-summarizer' },
};

export const specimenName = (id: string): string => SPECIMENS[id]?.name ?? id;

/** The heading every page starts with. Focus lands here after navigating. */
export function PageTitle({ children }: { children: ReactNode }) {
    return (
        <h1 id="page-title" tabIndex={-1}>
            {children}
        </h1>
    );
}

export function Panel({
    title,
    label,
    children,
}: {
    title: string;
    label?: string;
    children: ReactNode;
}) {
    return (
        <section className="panel">
            <div className="panel-head">
                <h2>{title}</h2>
                {label === undefined ? null : (
                    <span className="label">{label}</span>
                )}
            </div>
            {children}
        </section>
    );
}
