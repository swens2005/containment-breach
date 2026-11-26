import { useEffect, useRef, useState } from 'react';
import type { DashboardData } from '../../../packages/core/src/dashboard-data.ts';
import { hrefOf, parseRoute, type Route } from './lib/route.ts';
import {
    cellAttempts,
    dayOf,
    headlineOf,
    isOld,
    percentText,
    STATUS_WORD,
    statusOf,
    tally,
} from './lib/score.ts';
import {
    AttacksPage,
    AttemptPage,
    CellPage,
    DefensesPage,
    HowPage,
} from './pages.tsx';
import {
    PageTitle,
    Panel,
    type Run,
    SPECIMENS,
    specimenName,
} from './parts.tsx';
import { Rain } from './Rain.tsx';

const NAV: { route: Route; label: string }[] = [
    { route: { page: 'overview' }, label: 'Overview' },
    { route: { page: 'attacks' }, label: 'Attacks' },
    { route: { page: 'defenses' }, label: 'Defenses' },
    { route: { page: 'how' }, label: 'How it works' },
];

function DemoStrip({ data }: { data: DashboardData }) {
    const { run } = data;

    if (data.sample) {
        return (
            <div className="demo-strip" role="note">
                <span>
                    <b>Sample data.</b> Made-up replies from a stand-in, not
                    from any model. For working on this page only.
                </span>
            </div>
        );
    }

    return (
        <div className="demo-strip" role="note">
            <span>
                <b>Demo mode</b> ·{' '}
                {run === null
                    ? 'No recorded run yet'
                    : `Recorded run · ${dayOf(run.date)}`}{' '}
                · This page never calls a model
            </span>
            {run !== null && isOld(run.date, new Date()) ? (
                <span>
                    <b>Old run:</b> recorded more than 60 days ago
                </span>
            ) : null}
        </div>
    );
}

function Overview({ data }: { data: DashboardData }) {
    const { run } = data;

    return (
        <>
            <section className="hero">
                <div className="hero-copy">
                    <div className="brand">
                        <img
                            src="img/emblem.webp"
                            alt=""
                            width="58"
                            height="56"
                        />
                        <div>
                            <PageTitle>Containment Breach</PageTitle>
                            <div className="tag">Crash tests for AI apps</div>
                        </div>
                    </div>
                    <p>
                        A public test suite that attacks small sample AI apps
                        the way an attacker would, then shows how often each
                        attack gets out, for each model and each defense.
                    </p>
                    <div className="btns">
                        <a
                            className="tbtn solid"
                            href={hrefOf({ page: 'how' })}
                        >
                            Run it yourself
                        </a>
                        <a className="tbtn" href={hrefOf({ page: 'attacks' })}>
                            See the attacks
                        </a>
                    </div>
                </div>
                <figure>
                    <img
                        src="img/vault.webp"
                        alt="A vault door made of glowing green code in a dark containment facility"
                        width="1100"
                        height="619"
                    />
                </figure>
            </section>

            {run === null ? (
                <Panel title="No recorded run yet">
                    <p className="headline">
                        The suite is built, but it has not been run against a
                        real model yet. This page only shows numbers from
                        recorded runs, so there is no grid to show.
                    </p>
                    <p className="quiet">
                        The attacks and the defenses are ready to read.
                    </p>
                </Panel>
            ) : (
                <RunPanels data={data} run={run} />
            )}
        </>
    );
}

function RunPanels({ data, run }: { data: DashboardData; run: Run }) {
    const { baseline, best } = headlineOf(run, data.defenses);
    const models =
        run.models.length === 1 ? '1 model' : `${run.models.length} models`;

    return (
        <>
            <Panel
                title="Latest run"
                label={`Run ${run.date.slice(0, 10)} · suite v${run.suiteVersion} · ${models} × ${data.defenses.length} defenses × ${data.attacks.length} attacks × ${run.tries} tries`}
            >
                <p className="headline">
                    With <em>no defense</em>, {baseline.breached} of{' '}
                    {baseline.attempted} attempts got out (
                    {percentText(baseline)}).
                    {best === null ? null : (
                        <>
                            {' '}
                            {best.name} held best:{' '}
                            <strong>
                                {best.tally.breached} of {best.tally.attempted}
                            </strong>{' '}
                            got out.
                        </>
                    )}
                </p>
            </Panel>

            <Panel title="Breach grid" label="Share of attempts that got out">
                <div className="grid-wrap">
                    <table className="grid">
                        <caption>
                            Each cell: breached ÷ attempted, over all three
                            sample apps. Choose a cell for its attacks and
                            transcripts. A small sample of attacks on sample
                            apps: not a verdict on any model or vendor.
                        </caption>
                        <thead>
                            <tr>
                                <th scope="col">Model</th>
                                {data.defenses.map((defense) => (
                                    <th scope="col" key={defense.id}>
                                        {defense.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {run.models.map((model) => (
                                <tr key={model}>
                                    <th scope="row">{model}</th>
                                    {data.defenses.map((defense) => {
                                        const sum = tally(
                                            cellAttempts(
                                                run,
                                                model,
                                                defense.id,
                                            ),
                                        );
                                        const status = statusOf(sum);

                                        return (
                                            <td key={defense.id}>
                                                <a
                                                    className={`cell ${status}`}
                                                    href={hrefOf({
                                                        page: 'cell',
                                                        model,
                                                        defense: defense.id,
                                                    })}
                                                >
                                                    <i className="lamp" />
                                                    <b>{percentText(sum)}</b>
                                                    <span>
                                                        {STATUS_WORD[status]}
                                                        <span className="sr">
                                                            : {sum.breached} of{' '}
                                                            {sum.attempted}{' '}
                                                            attempts got out
                                                        </span>
                                                    </span>
                                                </a>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <ul className="legend">
                    <li>
                        <i className="dot contained" />
                        Contained: under 5%
                    </li>
                    <li>
                        <i className="dot leaking" />
                        Leaking: 5 to 25%
                    </li>
                    <li>
                        <i className="dot breached" />
                        Breached: over 25%, striped
                    </li>
                </ul>
            </Panel>

            <Panel title="Specimens" label="Sample apps under test, no defense">
                <div className="specimens">
                    {data.targets.map((target) => {
                        const sum = tally(
                            run.attempts.filter(
                                (attempt) =>
                                    attempt.target === target.id &&
                                    attempt.defense === 'none',
                            ),
                        );
                        const breached = sum.breached > 0;
                        const specimen = SPECIMENS[target.id];

                        return (
                            <div
                                className={`spec${breached ? ' breached' : ''}`}
                                key={target.id}
                            >
                                {specimen === undefined ? (
                                    <span />
                                ) : (
                                    <img
                                        src={`img/${specimen.image}${breached ? '-breached' : ''}.webp`}
                                        alt=""
                                        width="96"
                                        height="144"
                                    />
                                )}
                                <div>
                                    <b>{specimenName(target.id)}</b>
                                    <p>{target.summary}</p>
                                    <span
                                        className={`status ${breached ? 'breached' : 'contained'}`}
                                    >
                                        <i />
                                        {breached
                                            ? `Breached ${sum.breached} of ${sum.attempted}`
                                            : `Held ${sum.attempted} of ${sum.attempted}`}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Panel>
        </>
    );
}

function NotFound() {
    return (
        <section className="panel">
            <PageTitle>Page not found</PageTitle>
            <p>
                This address does not match a page.{' '}
                <a href={hrefOf({ page: 'overview' })}>Go to the overview</a>.
            </p>
        </section>
    );
}

function titleOf(route: Route): string {
    switch (route.page) {
        case 'overview':
            return 'Containment Breach';
        case 'cell':
            return 'Cell detail · Containment Breach';
        case 'attempt':
            return 'Transcript · Containment Breach';
        case 'attacks':
            return 'Attack library · Containment Breach';
        case 'defenses':
            return 'Defenses · Containment Breach';
        case 'how':
            return 'How it works · Containment Breach';
        case 'not-found':
            return 'Page not found · Containment Breach';
    }
}

function Page({ data, route }: { data: DashboardData; route: Route }) {
    switch (route.page) {
        case 'overview':
            return <Overview data={data} />;
        case 'cell':
            return data.run === null ? (
                <NotFound />
            ) : (
                <CellPage data={data} run={data.run} route={route} />
            );
        case 'attempt':
            return data.run === null ? (
                <NotFound />
            ) : (
                <AttemptPage data={data} run={data.run} route={route} />
            );
        case 'attacks':
            return <AttacksPage data={data} />;
        case 'defenses':
            return <DefensesPage data={data} />;
        case 'how':
            return <HowPage data={data} />;
        case 'not-found':
            return <NotFound />;
    }
}

export function App() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [failed, setFailed] = useState(false);
    const [route, setRoute] = useState<Route>(() => parseRoute(location.hash));
    const navigated = useRef(false);
    const main = useRef<HTMLElement>(null);

    useEffect(() => {
        // The page's own data file, written when the site was built.
        fetch('./data.json')
            .then((response) =>
                response.ok
                    ? (response.json() as Promise<DashboardData>)
                    : Promise.reject(new Error('No data file.')),
            )
            .then(setData)
            .catch(() => {
                setFailed(true);
            });
    }, []);

    useEffect(() => {
        const onChange = () => {
            navigated.current = true;
            setRoute(parseRoute(location.hash));
        };

        addEventListener('hashchange', onChange);

        return () => {
            removeEventListener('hashchange', onChange);
        };
    }, []);

    useEffect(() => {
        document.title = titleOf(route);

        // After a click on a link, start reading at the new page's
        // heading. Not on the first load.
        if (navigated.current) {
            scrollTo(0, 0);
            document.getElementById('page-title')?.focus();
        }
    }, [route, data]);

    return (
        <>
            <a
                className="skip"
                href={hrefOf(route)}
                onClick={(event) => {
                    event.preventDefault();
                    main.current?.focus();
                }}
            >
                Skip to the content
            </a>
            {data === null ? null : <DemoStrip data={data} />}
            <Rain />
            <div className="wrap">
                <nav aria-label="Pages" className="nav">
                    {route.page === 'overview' ? null : (
                        <a
                            className="nav-brand"
                            href={hrefOf({ page: 'overview' })}
                        >
                            <img
                                src="img/emblem.webp"
                                alt=""
                                width="30"
                                height="29"
                            />
                            Containment Breach
                        </a>
                    )}
                    <ul>
                        {NAV.map(({ route: to, label }) => (
                            <li key={label}>
                                <a
                                    href={hrefOf(to)}
                                    aria-current={
                                        to.page === route.page
                                            ? 'page'
                                            : undefined
                                    }
                                >
                                    {label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
                <main id="main" tabIndex={-1} ref={main}>
                    {failed ? (
                        <section className="panel" role="alert">
                            <PageTitle>
                                The results could not be loaded
                            </PageTitle>
                            <p>
                                The page's data file is missing. Reload the page
                                to try again.
                            </p>
                        </section>
                    ) : data === null ? (
                        <p className="quiet" role="status">
                            Loading the recorded run…
                        </p>
                    ) : (
                        <Page data={data} route={route} />
                    )}
                </main>
                <footer className="foot">
                    <p>
                        Every number on this page comes from a recorded run
                        against sample apps made for this project. All secrets
                        in them are fake. The code is public to read; all rights
                        reserved.
                    </p>
                    <p>
                        <a
                            href="https://github.com/swens2005/containment-breach"
                            rel="noreferrer"
                        >
                            The code on GitHub
                        </a>
                    </p>
                </footer>
            </div>
        </>
    );
}
