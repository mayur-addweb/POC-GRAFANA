"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSelectionInvalid = exports.sortYamlFiles = exports.formatYaml = exports.formatYamlWrapper = exports.validateYaml = exports.validateYamlWrapper = exports.sortYaml = exports.sortYamlWrapper = exports.getCustomSortKeywords = exports.dumpYaml = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const jsyaml = require("js-yaml");
const vscode = require("vscode");
const fs = require("fs");
const lib_1 = require("./lib");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    const formatter = {
        provideDocumentFormattingEdits() {
            return formatYamlWrapper();
        }
    };
    // have a function that adds/removes the formatter based
    // on a configuration setting
    let registration;
    function registerFormatterIfEnabled() {
        const isEnabled = vscode.workspace.getConfiguration().get('vscode-yaml-sort.useAsFormatter', true);
        if (isEnabled && !registration) {
            registration = vscode.languages.registerDocumentFormattingEditProvider('yaml', formatter);
        }
        else if (!isEnabled && registration) {
            registration.dispose();
            registration = undefined;
        }
    }
    // register at activate-time
    registerFormatterIfEnabled();
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    context.subscriptions.push(vscode.commands.registerCommand("vscode-yaml-sort.sortYaml", () => {
        sortYamlWrapper();
    }));
    context.subscriptions.push(vscode.commands.registerCommand("vscode-yaml-sort.validateYaml", () => {
        validateYamlWrapper();
    }));
    context.subscriptions.push(vscode.commands.registerCommand("vscode-yaml-sort.formatYaml", () => {
        formatYamlWrapper();
    }));
    context.subscriptions.push(vscode.commands.registerCommand("vscode-yaml-sort.customSortYaml_1", () => {
        sortYamlWrapper(1);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("vscode-yaml-sort.customSortYaml_2", () => {
        /* istanbul ignore next */
        sortYamlWrapper(2);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("vscode-yaml-sort.customSortYaml_3", () => {
        /* istanbul ignore next */
        sortYamlWrapper(3);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("vscode-yaml-sort.sortYamlFilesInDirectory", (uri) => {
        sortYamlFiles(uri);
    }));
}
exports.activate = activate;
/**
 * Dumps a yaml with the user specific settings.
 * @param   {string}  text     Yaml document which should be dumped.
 * @param   {boolean} sortKeys If set to true, the function will sort the keys in the document. Defaults to true.
 * @returns {string}           Clean yaml document.
 */
function dumpYaml(text, sortKeys, customSort, indent, forceQuotes, lineWidth, noArrayIndent, noCompatMode, quotingType, useCustomSortRecursively, schema, locale) {
    if (Object.keys(text).length === 0) {
        return "";
    }
    let yaml = jsyaml.dump(text, {
        indent: indent,
        forceQuotes: forceQuotes,
        lineWidth: lineWidth,
        noArrayIndent: noArrayIndent,
        noCompatMode: noCompatMode,
        quotingType: quotingType,
        schema: schema,
        sortKeys: (!(customSort > 0 && useCustomSortRecursively) ? sortKeys : (a, b) => {
            const sortOrder = getCustomSortKeywords(customSort);
            const indexA = sortOrder.indexOf(a);
            const indexB = sortOrder.indexOf(b);
            if (indexA > -1 && indexB > -1) {
                return indexA > indexB ? 1 : indexA < indexB ? -1 : 0;
            }
            if (indexA !== -1 && indexB === -1) {
                return -1;
            }
            if (indexA === -1 && indexB !== -1) {
                return 1;
            }
            return a.localeCompare(b, locale);
        })
    });
    // this is neccesary to avoid linebreaks in a selection sort
    yaml = (0, lib_1.removeTrailingCharacters)(yaml, 1);
    return yaml;
}
exports.dumpYaml = dumpYaml;
/**
 * Looks up the user settings for one of the three the custom sort keywords.
 * @param   {number}   count Number of the keyword list.
 * @returns {[string]} Array of custom sort keywords.
 */
function getCustomSortKeywords(count) {
    if (count == 1 || count == 2 || count == 3) {
        return vscode.workspace.getConfiguration().get("vscode-yaml-sort.customSortKeywords_" + count);
    }
    else
        throw new Error("The count parameter is not in a valid range");
}
exports.getCustomSortKeywords = getCustomSortKeywords;
function sortYamlWrapper(customSort = 0) {
    if (vscode.window.activeTextEditor) {
        const activeEditor = vscode.window.activeTextEditor;
        const emptyLinesUntilLevel = vscode.workspace.getConfiguration().get("vscode-yaml-sort.emptyLinesUntilLevel");
        const forceQuotes = vscode.workspace.getConfiguration().get("vscode-yaml-sort.forceQuotes");
        const indent = vscode.workspace.getConfiguration().get("vscode-yaml-sort.indent");
        const lineWidth = vscode.workspace.getConfiguration().get("vscode-yaml-sort.lineWidth");
        const locale = vscode.workspace.getConfiguration().get("vscode-yaml-sort.locale");
        const noArrayIndent = vscode.workspace.getConfiguration().get("vscode-yaml-sort.noArrayIndent");
        const noCompatMode = vscode.workspace.getConfiguration().get("vscode-yaml-sort.noCompatMode");
        const quotingType = vscode.workspace.getConfiguration().get("vscode-yaml-sort.quotingType");
        const schema = vscode.workspace.getConfiguration().get("vscode-yaml-sort.schema");
        const useCustomSortRecursively = vscode.workspace.getConfiguration().get("vscode-yaml-sort.useCustomSortRecursively");
        const useLeadingDashes = vscode.workspace.getConfiguration().get("vscode-yaml-sort.useLeadingDashes");
        let doc = activeEditor.document.getText();
        let numberOfLeadingSpaces = 0;
        let rangeToBeReplaced = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(activeEditor.document.lineCount + 1, 0));
        if (!["'", "\""].includes(quotingType)) {
            vscode.window.showErrorMessage("Quoting type is an invalid value. Please check your settings.");
            return false;
        }
        if (!activeEditor.selection.isEmpty) {
            let endLine = activeEditor.selection.end.line;
            // if the selection ends on the first character on a new line, we will ignore this line
            if (activeEditor.selection.end.character === 0) {
                endLine--;
            }
            // ensure that selection covers whole start and end line
            rangeToBeReplaced = new vscode.Selection(activeEditor.selection.start.line, 0, endLine, activeEditor.document.lineAt(endLine).range.end.character);
            doc = activeEditor.document.getText(rangeToBeReplaced);
            // check if selection to sort is valid, maybe the user missed a trailing line
            if (isSelectionInvalid(doc, (0, lib_1.getSchema)(schema))) {
                vscode.window.showErrorMessage("YAML selection is invalid. Please check the ending of your selection.");
                return false;
            }
        }
        else {
            if (!validateYaml(doc, (0, lib_1.getSchema)(schema))) {
                return false;
            }
        }
        let delimiters = (0, lib_1.getDelimiters)(doc, activeEditor.selection.isEmpty, useLeadingDashes);
        // remove yaml metadata tags
        const matchMetadata = /^%.*\n/gm;
        // set metadata tags, if there is no metadata tag it should be an emtpy array
        let newText = "";
        if (doc.match(matchMetadata)) {
            delimiters.shift();
            delimiters = (0, lib_1.removeLeadingLineBreakOfFirstElement)(delimiters);
        }
        doc = doc.replace(matchMetadata, "");
        doc = doc.replace(/^\n/, "");
        // sort yaml
        let validYaml = true;
        (0, lib_1.splitYaml)(doc).forEach((unsortedYaml) => {
            let sortedYaml = sortYaml(unsortedYaml, customSort, emptyLinesUntilLevel, indent, useCustomSortRecursively, forceQuotes, lineWidth, noArrayIndent, noCompatMode, quotingType, (0, lib_1.getSchema)(schema), locale);
            if (sortedYaml) {
                if (!activeEditor.selection.isEmpty) {
                    // get number of leading whitespaces, these whitespaces will be used for indentation
                    if (!unsortedYaml.startsWith(" ")) {
                        numberOfLeadingSpaces = 0;
                    }
                    else {
                        numberOfLeadingSpaces = unsortedYaml.search(/\S/);
                    }
                    sortedYaml = (0, lib_1.prependWhitespacesOnEachLine)(sortedYaml, numberOfLeadingSpaces);
                }
                newText += delimiters.shift() + sortedYaml;
            }
            else {
                validYaml = false;
            }
        });
        if (activeEditor.selection.isEmpty && useLeadingDashes) {
            newText = "---\n" + newText;
        }
        if (validYaml) {
            // update yaml
            activeEditor.edit((builder) => builder.replace(rangeToBeReplaced, newText));
            vscode.window.showInformationMessage("Keys resorted successfully");
        }
        return true;
    }
    return false;
}
exports.sortYamlWrapper = sortYamlWrapper;
function sortYaml(unsortedYaml, customSort = 0, emptyLinesUntilLevel, indent, useCustomSortRecursively, forceQuotes, lineWidth, noArrayIndent, noCompatMode, quotingType, schema, locale) {
    try {
        const loadOptions = { schema: schema };
        const unsortedYamlWithoutTabs = (0, lib_1.replaceTabsWithSpaces)(unsortedYaml, indent);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = jsyaml.load(unsortedYamlWithoutTabs, loadOptions);
        let sortedYaml = "";
        if (customSort > 0 && !useCustomSortRecursively) {
            const keywords = getCustomSortKeywords(customSort);
            keywords.forEach(key => {
                if (doc[key]) {
                    let sortedSubYaml = dumpYaml(doc[key], true, customSort, indent, forceQuotes, lineWidth, noArrayIndent, noCompatMode, quotingType, useCustomSortRecursively, schema, locale);
                    if ((sortedSubYaml.includes(":") && !sortedSubYaml.startsWith("|")) || sortedSubYaml.startsWith("-")) {
                        // when key cotains more than one line, we need some transformation:
                        // add a new line and indent each line some spaces
                        sortedSubYaml = (0, lib_1.prependWhitespacesOnEachLine)(sortedSubYaml, indent);
                        if (sortedSubYaml.endsWith("\n")) {
                            sortedSubYaml = (0, lib_1.removeTrailingCharacters)(sortedSubYaml, indent);
                        }
                        sortedYaml += key + ":\n" + sortedSubYaml + "\n";
                    }
                    else {
                        sortedYaml += key + ": " + sortedSubYaml + "\n";
                    }
                    // delete key from yaml
                    delete doc[key];
                }
            });
        }
        // either sort whole yaml or sort the rest of the yaml (which can be empty) and add it to the sortedYaml
        sortedYaml += dumpYaml(doc, true, customSort, indent, forceQuotes, lineWidth, noArrayIndent, noCompatMode, quotingType, useCustomSortRecursively, schema, locale);
        if (emptyLinesUntilLevel > 0) {
            sortedYaml = (0, lib_1.addNewLineBeforeKeywordsUpToLevelN)(emptyLinesUntilLevel, indent, sortedYaml);
        }
        return sortedYaml;
    }
    catch (e) {
        if (e instanceof Error) {
            vscode.window.showErrorMessage("Keys could not be resorted: " + e.message);
        }
        return null;
    }
}
exports.sortYaml = sortYaml;
function validateYamlWrapper() {
    const schema = vscode.workspace.getConfiguration().get("vscode-yaml-sort.schema");
    if (vscode.window.activeTextEditor) {
        validateYaml(vscode.window.activeTextEditor.document.getText(), (0, lib_1.getSchema)(schema));
        return true;
    }
    /* istanbul ignore next */
    return false;
}
exports.validateYamlWrapper = validateYamlWrapper;
/**
 * Validates a given yaml document.
 * @param   {string}  yaml Yaml to be validated.
 * @returns {boolean} True, if yaml is valid.
 */
function validateYaml(text, schema) {
    try {
        (0, lib_1.splitYaml)(text).forEach((yaml) => {
            jsyaml.load(yaml, { schema: schema });
        });
        vscode.window.showInformationMessage("YAML is valid.");
        return true;
    }
    catch (e) {
        if (e instanceof Error) {
            vscode.window.showErrorMessage("YAML is invalid: " + e.message);
        }
        return false;
    }
}
exports.validateYaml = validateYaml;
function formatYamlWrapper() {
    const activeEditor = vscode.window.activeTextEditor;
    const forceQuotes = vscode.workspace.getConfiguration().get("vscode-yaml-sort.forceQuotes");
    const indent = vscode.workspace.getConfiguration().get("vscode-yaml-sort.indent");
    const lineWidth = vscode.workspace.getConfiguration().get("vscode-yaml-sort.lineWidth");
    const locale = vscode.workspace.getConfiguration().get("vscode-yaml-sort.locale");
    const noArrayIndent = vscode.workspace.getConfiguration().get("vscode-yaml-sort.noArrayIndent");
    const noCompatMode = vscode.workspace.getConfiguration().get("vscode-yaml-sort.noCompatMode");
    const quotingType = vscode.workspace.getConfiguration().get("vscode-yaml-sort.quotingType");
    const schema = vscode.workspace.getConfiguration().get("vscode-yaml-sort.schema");
    const useLeadingDashes = vscode.workspace.getConfiguration().get("vscode-yaml-sort.useLeadingDashes");
    if (activeEditor) {
        let doc = activeEditor.document.getText();
        let delimiters = (0, lib_1.getDelimiters)(doc, true, useLeadingDashes);
        // remove yaml metadata tags
        const matchMetadata = /^%.*\n/gm;
        // set metadata tags, if there is no metadata tag it should be an emtpy array
        let newText = "";
        if (doc.match(matchMetadata)) {
            delimiters.shift();
            delimiters = (0, lib_1.removeLeadingLineBreakOfFirstElement)(delimiters);
        }
        doc = doc.replace(matchMetadata, "");
        doc = doc.replace(/^\n/, "");
        let formattedYaml;
        let validYaml = true;
        const yamls = (0, lib_1.splitYaml)(doc);
        for (const unformattedYaml of yamls) {
            formattedYaml = formatYaml(unformattedYaml, false, indent, forceQuotes, lineWidth, noArrayIndent, noCompatMode, quotingType, (0, lib_1.getSchema)(schema), locale);
            if (formattedYaml) {
                newText += delimiters.shift() + formattedYaml;
            }
            else {
                validYaml = false;
                break;
            }
        }
        if (validYaml) {
            if (useLeadingDashes) {
                newText = "---\n" + newText;
            }
            const edits = vscode.TextEdit.replace(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(activeEditor.document.lineCount + 1, 0)), newText);
            return [edits];
        }
    }
    return [];
}
exports.formatYamlWrapper = formatYamlWrapper;
/**
 * Formats a yaml document (without sorting).
 * @param   {string} yaml Yaml to be formatted.
 * @returns {string} Formatted yaml.
 */
function formatYaml(yaml, useLeadingDashes, indent, forceQuotes, lineWidth, noArrayIndent, noCompatMode, quotingType, schema, locale) {
    try {
        const loadOptions = { schema: schema };
        let doc = dumpYaml(jsyaml.load(yaml, loadOptions), false, 0, indent, forceQuotes, lineWidth, noArrayIndent, noCompatMode, quotingType, false, schema, locale);
        if (useLeadingDashes) {
            doc = "---\n" + doc;
        }
        vscode.window.showInformationMessage("Yaml formatted successfully");
        return doc;
    }
    catch (e) {
        if (e instanceof Error) {
            vscode.window.showErrorMessage("Yaml could not be formatted: " + e.message);
        }
        return null;
    }
}
exports.formatYaml = formatYaml;
/**
 * Sorts all yaml files in a directory
 * @param {vscode.Uri} uri Base URI
 */
function sortYamlFiles(uri) {
    const emptyLinesUntilLevel = vscode.workspace.getConfiguration().get("vscode-yaml-sort.emptyLinesUntilLevel");
    const forceQuotes = vscode.workspace.getConfiguration().get("vscode-yaml-sort.forceQuotes");
    const indent = vscode.workspace.getConfiguration().get("vscode-yaml-sort.indent");
    const lineWidth = vscode.workspace.getConfiguration().get("vscode-yaml-sort.lineWidth");
    const locale = vscode.workspace.getConfiguration().get("vscode-yaml-sort.locale");
    const noArrayIndent = vscode.workspace.getConfiguration().get("vscode-yaml-sort.noArrayIndent");
    const noCompatMode = vscode.workspace.getConfiguration().get("vscode-yaml-sort.noCompatMode");
    const quotingType = vscode.workspace.getConfiguration().get("vscode-yaml-sort.quotingType");
    const schema = vscode.workspace.getConfiguration().get("vscode-yaml-sort.schema");
    const useCustomSortRecursively = vscode.workspace.getConfiguration().get("vscode-yaml-sort.useCustomSortRecursively");
    const files = (0, lib_1.getYamlFilesInDirectory)(uri.fsPath);
    files.forEach((file) => {
        const yaml = fs.readFileSync(file, 'utf-8').toString();
        const sortedYaml = sortYaml(yaml, 0, emptyLinesUntilLevel, indent, useCustomSortRecursively, forceQuotes, lineWidth, noArrayIndent, noCompatMode, quotingType, (0, lib_1.getSchema)(schema), locale);
        if (sortedYaml) {
            try {
                fs.writeFileSync(file, sortedYaml);
            }
            catch (e) {
                /* istanbul ignore next */
                vscode.window.showErrorMessage("File " + file + " could not be sorted");
            }
        }
        else {
            vscode.window.showErrorMessage("File " + file + " could not be sorted");
        }
    });
    return true;
}
exports.sortYamlFiles = sortYamlFiles;
/**
 * Checks if a text ends with a character which suggests, that the selection is missing something.
 * @param   {string}      text Text which should represent a valid yaml selection to sort.
 * @param   {jsyaml.Schema} schema
 * @returns {boolean} true, if selection is missing something
 */
function isSelectionInvalid(text, schema) {
    // remove trailing whitespaces, to check for things like 'text:  '
    text = text.trim();
    const notValidEndingCharacters = [":", "|", ">"];
    if (notValidEndingCharacters.includes(text.charAt(text.length - 1))) {
        return true;
    }
    return !validateYaml(text, schema);
}
exports.isSelectionInvalid = isSelectionInvalid;
//# sourceMappingURL=extension.js.map