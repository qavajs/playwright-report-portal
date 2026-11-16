import { setWorldConstructor, TestWorld } from '@qavajs/playwright-runner-adapter';

// the default world (PlaywrightWorld) requests browser fixtures for every scenario; these
// scenarios don't touch the browser, so use TestWorld with a no-op `init` instead.
export class NoBrowserWorld extends TestWorld {
    cart!: { count: number; item: string };
    confirmed = false;
    wishlist!: { count: number; item: string };
    init = () => {};
}
setWorldConstructor(NoBrowserWorld);
