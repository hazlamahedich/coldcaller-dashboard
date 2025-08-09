/**
 * Babel Configuration for Jest and React 19
 * Handles ES6+ transpilation for test files
 */

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current', // For Jest (Node.js environment)
        },
        modules: 'commonjs' // Ensure CommonJS for Node.js/Jest compatibility
      }
    ],
    [
      '@babel/preset-react',
      {
        runtime: 'automatic', // React 17+ JSX Transform
        development: process.env.NODE_ENV === 'development'
      }
    ]
  ],
  plugins: [
    '@babel/plugin-transform-runtime',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-private-methods'
  ],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current'
            },
            modules: 'commonjs'
          }
        ],
        [
          '@babel/preset-react',
          {
            runtime: 'automatic'
          }
        ]
      ]
    }
  }
};