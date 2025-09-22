import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'happy-dom',
        include: ['test/unit/**/*.test.{ts,js}'],
        coverage: {
            include: ['js/**/*.ts'],
        },
    },
});
