/** @type {import('next').NextConfig} */

const isProduction = process.env.NODE_ENV === "production"

const withPWA = require('next-pwa')({
    dest: 'public',
    skipWaiting: true,
    register: isProduction,
    disable: !isProduction,
});


const nextConfig = withPWA({
    trailingSlash: true,
    cleanDistDir: true,
    images: {
        unoptimized: true
    },
    async headers() {
        return [
            {
                source: "/.well-known/nostr.json",
                headers: [
                    {
                        key: "Access-Control-Allow-Origin",
                        value: "*",
                    },
                ],
            },
        ];
    },
    async rewrites() {
        return [
            {
                source: "/.well-known/nostr.json",
                destination: "/api/nostr",
            },
        ];
    },
})

module.exports = nextConfig
