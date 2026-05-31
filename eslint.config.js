import jshowConfig from 'eslint-config-jshow';

const prettierConfigs = await jshowConfig.prettier(process.cwd());

export default [
  ...jshowConfig.node,
  ...prettierConfigs,
  {
    ignores: ['node_modules']
  },
  {
    files: ['**/*.{mjs,js,cjs}'],
    rules: {
      'no-console': 'off',
      'no-restricted-globals': 'off',
      'no-use-before-define': 'off'
    }
  }
];
