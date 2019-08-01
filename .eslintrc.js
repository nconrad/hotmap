module.exports = {
    "root": true,
    "extends": "standard",
    "parser": "babel-eslint",
    "parserOptions": {
        "sourceType": "module",
        "allowImportExportEverywhere": false,
        "codeFrame": false
    },
    "rules": {
        "semi": ["error", "always"],
        "space-before-function-paren": ["error", "never"],
        "indent": ["error", 4],
        "one-var": 0,
        "object-curly-spacing": 0,
        "no-unused-expressions": 0,
        "object-property-newline": 0,
        "no-new": 0,
        "comma-dangle": 0,
        "curly": 0,
        "space-in-parens": 0,
        "eqeqeq": 0,
        "no-unused-vars": 0, // relying on editor for this one
        "no-multiple-empty-lines":  ["error", {"max": 2}],
        "padded-blocks": 0,
        "new-cap": 0, // ignore for Pixi.js
        "no-extend-native": 0,
        "no-throw-literal": 0,
        "no-multi-spaces": 0,
        "no-restricted-modules": 0
    },
    "globals": {
        "PIXI": "readonly",
        "requestAnimationFrame": "readonly",
        "fetch": "readonly",
        "alert": "readonly",
        "Picker": "readonly",
        "Blob": "readonly"
    }
};