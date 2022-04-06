"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addNewLineBeforeKeywordsUpToLevelN = exports.addNewLineBeforeRootKeywords = exports.replaceTabsWithSpaces = exports.getDelimiters = exports.splitYaml = exports.removeLeadingLineBreakOfFirstElement = exports.prependWhitespacesOnEachLine = exports.removeTrailingCharacters = exports.removeQuotesFromKeys = exports.getYamlFilesInDirectory = exports.getSchema = void 0;
const glob_1 = require("glob");
const jsyaml = require("js-yaml");
const cloudformation_js_yaml_schema_1 = require("cloudformation-js-yaml-schema");
const homeassistant_js_yaml_schema_1 = require("homeassistant-js-yaml-schema");
/**
 * Returns a schema from js-yaml when a schema name is passed
 * @param {string} schema Schema
 * @returns {jsyaml.Schema} Schema
 */
function getSchema(schema) {
    switch (schema) {
        case "HOMEASSISTANT_SCHEMA": return homeassistant_js_yaml_schema_1.HOMEASSISTANT_SCHEMA;
        case "CLOUDFORMATION_SCHEMA": return cloudformation_js_yaml_schema_1.CLOUDFORMATION_SCHEMA;
        case "CORE_SCHEMA": return jsyaml.CORE_SCHEMA;
        case "DEFAULT_SCHEMA": return jsyaml.DEFAULT_SCHEMA;
        case "FAILSAFE_SCHEMA": return jsyaml.FAILSAFE_SCHEMA;
        case "JSON_SCHEMA": return jsyaml.JSON_SCHEMA;
        default: return jsyaml.DEFAULT_SCHEMA;
    }
}
exports.getSchema = getSchema;
/**
 * Returns all files in a directory and its subdirectories with extension .yml or .yaml
 * @param   {vscode.Uri} uri Base URI
 * @returns {string[]}   List of Yaml files
 */
function getYamlFilesInDirectory(uri) {
    return glob_1.glob.sync(uri + "/**/**.y?(a)ml");
}
exports.getYamlFilesInDirectory = getYamlFilesInDirectory;
/**
 * Removes single quotes from special keywords
 * e.g. '1.4.2': will result in 1.4.2: or 'puppet::key': will result in puppet::key:
 * @param  {string} text String for processing.
 * @returns {string} processed text
 */
function removeQuotesFromKeys(text) {
    return text.replace(/'(.*)':/g, "$1:");
}
exports.removeQuotesFromKeys = removeQuotesFromKeys;
/**
 * Removes a given count of characters from a string.
 * @param   {string} text  String for processing.
 * @param   {number} count The number of characters to remove from the end of the returned string.
 * @returns {string} Input text with removed trailing characters.
 */
function removeTrailingCharacters(text, count = 1) {
    if (count >= 0 && count <= text.length) {
        return text.substr(0, text.length - count);
    }
    else {
        throw new Error("The count parameter is not in a valid range");
    }
}
exports.removeTrailingCharacters = removeTrailingCharacters;
/**
 * Prepends a given count of whitespaces to every single line in a text.
 * Lines with yaml seperators (---) will not be indented
 * @param   {string} text  Text which should get some leading whitespaces on each line.
 * @param   {number} count The number of whitesspaces to prepend on each line of the returned string.
 * @returns {string} Input Text, which has the given count of whitespaces prepended on each single line.
 */
function prependWhitespacesOnEachLine(text, count) {
    if (count < 0) {
        throw new Error("The count parameter is not a positive number");
    }
    const spaces = " ".repeat(count);
    return text.replace(/^(?!---)/mg, spaces);
}
exports.prependWhitespacesOnEachLine = prependWhitespacesOnEachLine;
/**
 * Removes the leading line break of the first element of an array.
 * @param   {RegExpMatchArray} delimiters Array for processing.
 * @returns {RegExpMatchArray}
 */
function removeLeadingLineBreakOfFirstElement(delimiters) {
    let firstDelimiter = delimiters.shift();
    if (firstDelimiter) {
        firstDelimiter = firstDelimiter.replace(/^\n/, "");
        delimiters.unshift(firstDelimiter);
    }
    return delimiters;
}
exports.removeLeadingLineBreakOfFirstElement = removeLeadingLineBreakOfFirstElement;
/**
 * Splits a string, which contains multiple yaml documents.
 * @param   {string}   multipleYamls String which contains multiple yaml documents.
 * @returns {[string]} Array of yaml documents.
 */
function splitYaml(multipleYamls) {
    return multipleYamls.split(/^---.*/m).filter((obj) => obj);
}
exports.splitYaml = splitYaml;
/**
 * Returns all delimiters with comments.
 * @param   {string}  multipleYamls String which contains multiple yaml documents.
 * @param   {boolean} isSelectionEmpty Specify if the text is an selection
 * @param   {boolean} useLeadingDashes Specify if the documents should have a leading delimiter.
 *                                   If set to false, it will add an empty array element at the beginning of the output.
 * @returns {[string]} Array of yaml delimiters.
 */
function getDelimiters(multipleYamls, isSelectionEmpty, useLeadingDashes) {
    // remove empty lines
    multipleYamls = multipleYamls.trim();
    multipleYamls = multipleYamls.replace(/^\n/, "");
    let delimiters = multipleYamls.match(/^---.*/gm);
    if (!delimiters) {
        return [""];
    }
    // append line break to every delimiter
    delimiters = delimiters.map((delimiter) => "\n" + delimiter + "\n");
    if (delimiters) {
        if (isSelectionEmpty) {
            if (!useLeadingDashes && multipleYamls.startsWith("---")) {
                delimiters.shift();
                delimiters.unshift("");
            }
            else if (useLeadingDashes && !multipleYamls.startsWith("---")) {
                delimiters.unshift("---\n");
            }
            else {
                delimiters.unshift("");
            }
        }
        else {
            if (!multipleYamls.startsWith("---")) {
                delimiters.unshift("");
            }
            else {
                let firstDelimiter = delimiters.shift();
                if (firstDelimiter) {
                    firstDelimiter = firstDelimiter.replace(/^\n/, "");
                    delimiters.unshift(firstDelimiter);
                }
            }
        }
    }
    return delimiters;
}
exports.getDelimiters = getDelimiters;
/**
 * Replace all tabs in a given string with spaces
 * @param   {string} text Text to be processed
 * @param   {number} count Number of spaces to be added for a removed tab
 * @returns {string} processed text
 */
function replaceTabsWithSpaces(text, count) {
    if (count < 1) {
        throw new Error("The count parameter has to be 1 or higher");
    }
    const spaces = " ".repeat(count);
    return text.replace(/\t/mg, spaces);
}
exports.replaceTabsWithSpaces = replaceTabsWithSpaces;
/**
 * Add a new line before each occurence of a top level keyword after a new line
 * @param   {string} text Text to be processed
 * @returns {string} processed text
 */
function addNewLineBeforeRootKeywords(text) {
    return text.replace(/\n[^\s]*:/g, "\n$&");
}
exports.addNewLineBeforeRootKeywords = addNewLineBeforeRootKeywords;
/**
 * Add a new line before each keyword up to level n
 * @param   {number} n Last level to add new lines
 * @param   {number} indent Indentation of yaml
 * @param   {string} text Text to be processed
 * @returns {string} text with new lines
 */
function addNewLineBeforeKeywordsUpToLevelN(n, indent, text) {
    let level = 0;
    let result = text;
    while (level < n) {
        if (level == 0) {
            result = result.replace(/\n[^\s].*:/g, "\n$&");
        }
        else {
            let spaces = " ".repeat(indent);
            spaces = spaces.repeat(level);
            const regex = new RegExp("\n" + spaces + "[\\w-]*:", "g");
            result = result.replace(regex, "\n$&");
        }
        level++;
    }
    return result;
}
exports.addNewLineBeforeKeywordsUpToLevelN = addNewLineBeforeKeywordsUpToLevelN;
//# sourceMappingURL=lib.js.map