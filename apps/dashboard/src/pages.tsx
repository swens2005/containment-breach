import type {
    DashboardAttempt,
    DashboardData,
} from '../../../packages/core/src/dashboard-data.ts';
import { PageTitle, Panel, type Run, specimenName } from './parts.tsx';
import { hrefOf, type Route } from './lib/route.ts';
import {
    cellAttempts,
    percentText,
    splitAround,
    STATUS_WORD,
    statusOf,
    tally,
} from './lib/score.ts';

const REPO = 'https://github.com/swens2005/containment-breach';

const OUTCOME_WORD = { held: 'Held', breached: 'Breached', error: 'Failed' };

const DELIVERY_WORD: Record<string, string> = {
    typed: 'Typed to the app',
    email: 'Hidden in an email',
    document: 'Hidden in a document',
    'web-page': 'Hidden in a web page',
};

const JUDGE_WORD = {
    canary: 'Canary check: plain code looks for the fake secret in the reply',
    'forbidden-tool':
        'Tool check: plain code looks for a call to the forbidden tool',
};

type Attack = DashboardData['attacks'][number];

function Back({ to, children }: { to: Route; children: string }) {
    return (
        <p className="back">
            <a href={hrefOf(to)}>← {children}</a>
        </p>
    );
}

function AttackFacts({ attack }: { attack: Attack }) {
    return (
        <dl className="facts">
            <dt>OWASP</dt>
            <dd>
                {attack.owasp}: {attack.owaspName}
            </dd>
            <dt>ATLAS</dt>
            <dd>{attack.atlas}</dd>
            <dt>Way in</dt>
            <dd>{DELIVERY_WORD[attack.delivery] ?? attack.delivery}</dd>
            <dt>Judge</dt>
            <dd>{JUDGE_WORD[attack.judge.kind]}</dd>
            <dt>Source</dt>
            <dd>
                <a href={attack.source} rel="noreferrer">
                    {new URL(attack.source).hostname}
                </a>
            </dd>
        </dl>
    );
}

export function CellPage({
    data,
    run,
    route,
}: {
    data: DashboardData;
    run: Run;
    route: Extract<Route, { page: 'cell' }>;
}) {
    const defense = data.defenses.find((d) => d.id === route.defense);
    const attempts = cellAttempts(run, route.model, route.defense);

    if (defense === undefined || attempts.length === 0) {
        return (
            <section className="panel">
                <PageTitle>Cell not found</PageTitle>
                <Back to={{ page: 'overview' }}>Back to the grid</Back>
            </section>
        );
    }

    const sum = tally(attempts);
    const status = statusOf(sum);
    const categories = [...new Set(data.attacks.map((a) => a.owasp))].sort();
    const tries = Array.from({ length: run.tries }, (_, n) => n + 1);

    return (
        <>
            <section className="panel">
                <Back to={{ page: 'overview' }}>Back to the grid</Back>
                <PageTitle>
                    {route.model} · {defense.name}
                </PageTitle>
                <p className="quiet">{defense.summary}</p>
                <p className={`status big ${status}`}>
                    <i />
                    {STATUS_WORD[status]}: {sum.breached} of {sum.attempted}{' '}
                    attempts got out ({percentText(sum)})
                    {sum.errors > 0
                        ? `. ${sum.errors} model calls failed and are not counted.`
                        : '.'}
                </p>
            </section>

            {categories.map((category) => {
                const attacks = data.attacks.filter(
                    (attack) =>
                        attack.owasp === category &&
                        attempts.some((a) => a.attack === attack.id),
                );

                if (attacks.length === 0) {
                    return null;
                }

                return (
                    <Panel
                        key={category}
                        title={`${category}: ${attacks[0]?.owaspName ?? ''}`}
                        label="OWASP Top 10 for LLM Applications, 2025"
                    >
                        <div className="grid-wrap">
                            <table className="tries">
                                <thead>
                                    <tr>
                                        <th scope="col">Attack</th>
                                        <th scope="col">Sample app</th>
                                        {tries.map((n) => (
                                            <th scope="col" key={n}>
                                                Try {n}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {attacks.map((attack) => {
                                        const mine = attempts.filter(
                                            (a) => a.attack === attack.id,
                                        );

                                        return (
                                            <tr key={attack.id}>
                                                <th scope="row">
                                                    {attack.title}
                                                </th>
                                                <td>
                                                    {specimenName(
                                                        mine[0]?.target ?? '',
                                                    )}
                                                </td>
                                                {tries.map((n) => {
                                                    const one = mine.find(
                                                        (a) => a.attempt === n,
                                                    );

                                                    return (
                                                        <td key={n}>
                                                            {one ===
                                                            undefined ? (
                                                                '–'
                                                            ) : (
                                                                <a
                                                                    className={`chip ${one.outcome}`}
                                                                    href={hrefOf(
                                                                        {
                                                                            page: 'attempt',
                                                                            ...one,
                                                                        },
                                                                    )}
                                                                >
                                                                    <i />
                                                                    {
                                                                        OUTCOME_WORD[
                                                                            one
                                                                                .outcome
                                                                        ]
                                                                    }
                                                                    <span className="sr">
                                                                        :{' '}
                                                                        {
                                                                            attack.title
                                                                        }
                                                                        , try{' '}
                                                                        {n}
                                                                    </span>
                                                                </a>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Panel>
                );
            })}
        </>
    );
}

/** A text with every hit of a needle wrapped, as React nodes. */
function Marked({
    text,
    needle,
    className,
}: {
    text: string;
    needle: string;
    className?: string;
}) {
    return (
        <>
            {splitAround(text, needle).map((part, n) =>
                part.hit ? (
                    <mark className={className} key={n}>
                        {part.text}
                    </mark>
                ) : (
                    <span key={n}>{part.text}</span>
                ),
            )}
        </>
    );
}

export function AttemptPage({
    data,
    run,
    route,
}: {
    data: DashboardData;
    run: Run;
    route: Extract<Route, { page: 'attempt' }>;
}) {
    const same = (a: DashboardAttempt) =>
        a.model === route.model &&
        a.defense === route.defense &&
        a.attack === route.attack &&
        a.target === route.target;
    const one = run.attempts.find(
        (a) => same(a) && a.attempt === route.attempt,
    );
    const attack = data.attacks.find((a) => a.id === route.attack);
    const target = data.targets.find((t) => t.id === route.target);
    const defense = data.defenses.find((d) => d.id === route.defense);
    const cell: Route = {
        page: 'cell',
        model: route.model,
        defense: route.defense,
    };

    if (
        one === undefined ||
        attack === undefined ||
        target === undefined ||
        defense === undefined
    ) {
        return (
            <section className="panel">
                <PageTitle>Transcript not found</PageTitle>
                <Back to={{ page: 'overview' }}>Back to the grid</Back>
            </section>
        );
    }

    const others = run.attempts.filter(
        (a) => same(a) && a.attempt !== one.attempt,
    );

    return (
        <>
            <section className="panel">
                <Back to={cell}>All attacks in this cell</Back>
                <PageTitle>{attack.title}</PageTitle>
                <p className="label">
                    {specimenName(target.id)} · {one.model} · {defense.name} ·
                    try {one.attempt} of {run.tries}
                </p>
            </section>

            <div className="twocol">
                <Panel title="Transcript">
                    <div className="console">
                        <div>
                            <div className="who">What the app was sent</div>
                            <pre>
                                <Marked
                                    text={one.sent}
                                    needle={attack.payload}
                                    className="poison"
                                />
                            </pre>
                            <p className="note">
                                The part with the amber bar is the attacker's
                                text.
                            </p>
                        </div>
                        <div>
                            <div className="who">
                                What the app answered
                                {defense.id === 'none'
                                    ? ''
                                    : `, after the defense (${defense.name})`}
                            </div>
                            {one.outcome === 'error' ? (
                                <p className="note">
                                    The model call failed, so there is no
                                    answer.
                                </p>
                            ) : (
                                <pre>
                                    <Marked
                                        text={
                                            one.reply === ''
                                                ? '(no text)'
                                                : one.reply
                                        }
                                        needle={target.canary}
                                    />
                                </pre>
                            )}
                        </div>
                        {one.toolCalls.length === 0 ? null : (
                            <div>
                                <div className="who">
                                    Tool calls the app asked for (never carried
                                    out)
                                </div>
                                {one.toolCalls.map((call, n) => (
                                    <pre key={n}>
                                        {call.name}{' '}
                                        <Marked
                                            text={JSON.stringify(
                                                call.input,
                                                null,
                                                2,
                                            )}
                                            needle={target.canary}
                                        />
                                    </pre>
                                ))}
                            </div>
                        )}
                        <div className={`verdict ${one.outcome}`}>
                            <b>{OUTCOME_WORD[one.outcome]}</b>
                            <span>{one.reason}</span>
                        </div>
                    </div>
                    {others.length === 0 ? null : (
                        <div className="btns">
                            {others.map((other) => (
                                <a
                                    className="tbtn"
                                    key={other.attempt}
                                    href={hrefOf({ page: 'attempt', ...other })}
                                >
                                    Try {other.attempt}:{' '}
                                    {OUTCOME_WORD[other.outcome]}
                                </a>
                            ))}
                        </div>
                    )}
                </Panel>
                <Panel title="The attack">
                    <AttackFacts attack={attack} />
                    <p className="quiet">
                        The sample app: {target.summary} Its secret,{' '}
                        <code>{target.canary}</code>, is fake and unlocks
                        nothing.
                    </p>
                </Panel>
            </div>
        </>
    );
}

export function AttacksPage({ data }: { data: DashboardData }) {
    return (
        <>
            <section className="panel">
                <PageTitle>Attack library</PageTitle>
                <p>
                    {data.attacks.length} attacks, one file each. They try to
                    make the sample apps of this project leak a planted fake
                    secret or misuse their own tool. Nothing here is aimed at
                    anyone else's app, and nothing asks a model for harmful
                    content.
                </p>
            </section>
            <div className="cards">
                {data.attacks.map((attack) => (
                    <section className="panel" key={attack.id}>
                        <h2>{attack.title}</h2>
                        <AttackFacts attack={attack} />
                        <details>
                            <summary>Show the attack's text</summary>
                            <pre className="payload">{attack.payload}</pre>
                        </details>
                    </section>
                ))}
            </div>
        </>
    );
}

export function DefensesPage({ data }: { data: DashboardData }) {
    return (
        <>
            <section className="panel">
                <PageTitle>Defenses</PageTitle>
                <p>
                    Every attack is tried under each of these setups, one at a
                    time, so each column of the grid shows what one defense is
                    worth alone.
                </p>
            </section>
            <section className="panel">
                <ol className="steps">
                    {data.defenses.map((defense) => (
                        <li key={defense.id}>
                            <b>{defense.name}</b>
                            <p>{defense.summary}</p>
                        </li>
                    ))}
                </ol>
                <p className="quiet">
                    Tool permissions only help an app that has tools. For the
                    support bot and the summarizer that column equals no
                    defense.
                </p>
                <p>
                    <a
                        href={`${REPO}/blob/main/packages/core/src/defenses.ts`}
                        rel="noreferrer"
                    >
                        The code of all five setups
                    </a>
                </p>
            </section>
        </>
    );
}

export function HowPage({ data }: { data: DashboardData }) {
    return (
        <>
            <section className="panel">
                <PageTitle>How it works</PageTitle>
                <p>
                    It answers one question: an AI feature was safe when it
                    shipped. Is it still safe now that the model behind it has
                    changed?
                </p>
            </section>
            <Panel title="One run">
                <ol className="steps">
                    <li>
                        <b>Sample apps.</b>
                        <p>
                            {data.targets.length} small apps that look like real
                            AI features. Each guards a fake secret, a canary
                            such as <code>CB-CANARY-7F3A</code>.
                        </p>
                    </li>
                    <li>
                        <b>Attacks.</b>
                        <p>
                            {data.attacks.length} attacks, typed in or hidden in
                            an email or a document. Each is tried three times,
                            because model replies vary.
                        </p>
                    </li>
                    <li>
                        <b>Defenses.</b>
                        <p>
                            Every attack runs under each of{' '}
                            {data.defenses.length} defense setups.
                        </p>
                    </li>
                    <li>
                        <b>Judges.</b>
                        <p>
                            Plain code, no model: did the canary show up in the
                            reply, or did the app ask for a tool it must not
                            use?
                        </p>
                    </li>
                    <li>
                        <b>Score.</b>
                        <p>
                            Breached ÷ attempted, for each model and defense.
                            This page replays the recorded replies. It never
                            calls a model.
                        </p>
                    </li>
                </ol>
            </Panel>
            <Panel title="Run it yourself">
                <p>
                    You need Node 24. The demo replays the recorded run and
                    costs nothing.
                </p>
                <pre className="payload">
                    {`git clone ${REPO}.git\ncd containment-breach && npm ci\nnpm run cb -- run`}
                </pre>
                <p className="quiet">
                    A live run against real models needs your own API key and{' '}
                    <code>CB_MODE=live</code>. It has a token limit, a spending
                    cap for the run and one for the month, and{' '}
                    <code>npm run cb -- plan</code> shows the highest possible
                    cost first.
                </p>
            </Panel>
        </>
    );
}
