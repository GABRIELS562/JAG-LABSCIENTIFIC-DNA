// Prettier Configuration for LIMS Application
// This configuration ensures consistent code formatting across the entire project

module.exports = {
  // Basic formatting options
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,
  
  // JavaScript/TypeScript specific
  arrowParens: 'avoid',
  bracketSpacing: true,
  bracketSameLine: false,
  
  // JSX specific
  jsxSingleQuote: true,
  jsxBracketSameLine: false,
  
  // HTML specific
  htmlWhitespaceSensitivity: 'css',
  
  // Markdown specific
  proseWrap: 'preserve',
  
  // End of line handling
  endOfLine: 'lf',
  
  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',
  
  // Plugin configurations
  plugins: [
    'prettier-plugin-organize-imports',
    'prettier-plugin-packagejson',
    'prettier-plugin-sql'
  ],
  
  // Override configurations for specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
        tabWidth: 2
      }
    },
    {
      files: '*.yml',
      options: {
        printWidth: 120,
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: '*.yaml',
      options: {
        printWidth: 120,
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: '*.sql',
      options: {
        printWidth: 120,
        tabWidth: 2,
        keywordCase: 'upper',
        functionCase: 'upper'
      }
    },
    {
      files: '*.css',
      options: {
        printWidth: 120,
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: '*.scss',
      options: {
        printWidth: 120,
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: '*.less',
      options: {
        printWidth: 120,
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: 'package.json',
      options: {
        printWidth: 120,
        tabWidth: 2,
        plugins: ['prettier-plugin-packagejson']
      }
    },
    {
      files: '*.jsx',
      options: {
        printWidth: 100,
        tabWidth: 2,
        jsxSingleQuote: true,
        jsxBracketSameLine: false
      }
    },
    {
      files: '*.tsx',
      options: {
        printWidth: 100,
        tabWidth: 2,
        jsxSingleQuote: true,
        jsxBracketSameLine: false
      }
    },
    {
      files: '*.ts',
      options: {
        printWidth: 100,
        tabWidth: 2,
        parser: 'typescript'
      }
    },
    {
      files: '*.graphql',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.gql',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.vue',
      options: {
        printWidth: 100,
        tabWidth: 2,
        singleQuote: true
      }
    },
    {
      files: '*.xml',
      options: {
        printWidth: 120,
        tabWidth: 2,
        xmlSelfClosingSpace: false,
        xmlWhitespaceSensitivity: 'ignore'
      }
    },
    {
      files: '*.toml',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.properties',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.dockerfile',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: 'Dockerfile*',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.sh',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.py',
      options: {
        printWidth: 88,
        tabWidth: 4
      }
    },
    {
      files: '*.go',
      options: {
        printWidth: 120,
        tabWidth: 4,
        useTabs: true
      }
    },
    {
      files: '*.java',
      options: {
        printWidth: 120,
        tabWidth: 4
      }
    },
    {
      files: '*.c',
      options: {
        printWidth: 120,
        tabWidth: 4
      }
    },
    {
      files: '*.cpp',
      options: {
        printWidth: 120,
        tabWidth: 4
      }
    },
    {
      files: '*.h',
      options: {
        printWidth: 120,
        tabWidth: 4
      }
    },
    {
      files: '*.hpp',
      options: {
        printWidth: 120,
        tabWidth: 4
      }
    },
    {
      files: '*.rs',
      options: {
        printWidth: 120,
        tabWidth: 4
      }
    },
    {
      files: '*.php',
      options: {
        printWidth: 120,
        tabWidth: 4
      }
    },
    {
      files: '*.rb',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.swift',
      options: {
        printWidth: 120,
        tabWidth: 4
      }
    },
    {
      files: '*.kt',
      options: {
        printWidth: 120,
        tabWidth: 4
      }
    },
    {
      files: '*.scala',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.clj',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.elm',
      options: {
        printWidth: 120,
        tabWidth: 4
      }
    },
    {
      files: '*.hbs',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.handlebars',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.twig',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.liquid',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.ejs',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.pug',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.jade',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.njk',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.nunjucks',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.mustache',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.dust',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.hogan',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.dot',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.ect',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.vash',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.slm',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.marko',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.rhtml',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.erb',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.haml',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.slim',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    }
  ],
  
  // Language-specific formatting
  parsers: {
    javascript: 'babel',
    typescript: 'typescript',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    json5: 'json5',
    graphql: 'graphql',
    markdown: 'markdown',
    mdx: 'mdx',
    yaml: 'yaml',
    html: 'html',
    vue: 'vue',
    angular: 'angular',
    lwc: 'lwc'
  },
  
  // Ignore patterns
  ignorePath: '.prettierignore',
  
  // Require pragma
  requirePragma: false,
  insertPragma: false,
  
  // Range formatting
  rangeStart: 0,
  rangeEnd: Infinity,
  
  // Debugging
  editorconfig: true,
  
  // Experimental features
  experimentalTernaries: false
};