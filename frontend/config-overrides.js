module.exports = function override(config) {
    config.resolve.fallback = {
        ...config.resolve.fallback,
        "http": false,
        "https": false,
        "http2": false,
        "util": false,
        "zlib": false,
        "stream": false,
        "url": false,
        "crypto": false,
        "assert": false,
    };
    return config;
};
