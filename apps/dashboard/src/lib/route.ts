/** The pages of the dashboard. The address is the part after `#`. */
export type Route =
    | { page: 'overview' }
    | { page: 'cell'; model: string; defense: string }
    | {
          page: 'attempt';
          model: string;
          defense: string;
          attack: string;
          target: string;
          attempt: number;
      }
    | { page: 'attacks' }
    | { page: 'defenses' }
    | { page: 'how' }
    | { page: 'not-found' };

function decode(part: string | undefined): string | undefined {
    if (part === undefined || part === '') {
        return undefined;
    }

    try {
        return decodeURIComponent(part);
    } catch {
        return undefined;
    }
}

/** Read a route from `location.hash`. Anything odd is "not found". */
export function parseRoute(hash: string): Route {
    const path = hash.replace(/^#\/?/, '');

    if (path === '') {
        return { page: 'overview' };
    }

    const [page, ...rest] = path.split('/');
    const parts = rest.map(decode);

    if (parts.includes(undefined)) {
        return { page: 'not-found' };
    }

    const [a, b, c, d, e] = parts as string[];

    if (
        page === 'cell' &&
        rest.length === 2 &&
        a !== undefined &&
        b !== undefined
    ) {
        return { page: 'cell', model: a, defense: b };
    }

    if (
        page === 'attempt' &&
        rest.length === 5 &&
        a !== undefined &&
        b !== undefined &&
        c !== undefined &&
        d !== undefined &&
        e !== undefined &&
        /^[1-9]\d?$/.test(e)
    ) {
        return {
            page: 'attempt',
            model: a,
            defense: b,
            attack: c,
            target: d,
            attempt: Number(e),
        };
    }

    if (
        (page === 'attacks' || page === 'defenses' || page === 'how') &&
        rest.length === 0
    ) {
        return { page };
    }

    return { page: 'not-found' };
}

/** The link to a route. */
export function hrefOf(route: Route): string {
    const join = (...parts: (string | number)[]) =>
        `#/${parts.map((part) => encodeURIComponent(String(part))).join('/')}`;

    switch (route.page) {
        case 'overview':
        case 'not-found':
            return '#/';
        case 'cell':
            return join('cell', route.model, route.defense);
        case 'attempt':
            return join(
                'attempt',
                route.model,
                route.defense,
                route.attack,
                route.target,
                route.attempt,
            );
        default:
            return join(route.page);
    }
}
