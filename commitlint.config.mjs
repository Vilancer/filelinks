export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Default preset forbids PascalCase/sentence-case in the subject; that rejects
    // legitimate messages that mention types or components (e.g. LinkType).
    'subject-case': [0],
  },
};
