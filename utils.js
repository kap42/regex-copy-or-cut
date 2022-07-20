const { setServers } = require("dns");
const vscode = require("vscode");

/**
 * Show input box, return result
 * @param {vscode.window} window
 */
async function showInputBox(window) {
  let result = await window.showInputBox({
    placeHolder: "Search term (regular expression)",
  });

  return result;
}

/**
 * Function to get lines matching the search term in the editor
 * @param {vscode.TextEditor} editor
 *   A text editor, should be the currently active one
 * @param {String} searchTerm
 *   A regular expression
 * @returns {Array}
 *   Array containing a list of ranges of the matching lines (item 0) and the text of them (item 1)
 * @todo Optionally offer plain string matching
 */
function getMatchingLines(editor, searchTerm) {
  let currentLine;
  let lineContent;
  let listOfRanges = [];
  let text = "";

  // The end of line most commonly used in the document
  const endOfLine =
    editor.document.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n";

  try {
    // iterate though the lines in the document
    for (let index = 0; index < editor.document.lineCount; index++) {
      // Get the current line
      currentLine = editor.document.lineAt(index);
      // Get the text of the current line
      lineContent = currentLine.text;

      // If the regex provided in searchTerm matches part of the line
      let match = lineContent.match(searchTerm);

      if (match != null) {
        if (match.length > 1) {
          for (let i = 1; i < match.length; i++) {
            text += match[i] + endOfLine;
          }
        } else {
          text += lineContent + endOfLine;
        }

        // Append the result to the list of ranges
        listOfRanges.push(currentLine.rangeIncludingLineBreak);
      }
    }
  } catch (e) {
    vscode.window.showErrorMessage(
      "Unable to complete action due to unexpected error " + e
    );
  }

  return [listOfRanges, text];
}

/**
 * The function that deletes, copies and cuts based on the output of the other functions
 * @param {String} mode The mode to work in - copy, cut or delete
 * @param {boolean} shouldOpenNewTab Whether we should open a new tab and paste the text into it
 */
function commandsImplementation(mode, shouldOpenNewTab) {
  const window = vscode.window;
  let result = showInputBox(window);
  let editor = vscode.window.activeTextEditor;

  // Action to be taken when box is submitted
  result.then((searchTerm) => {
    try {
      // Ensuring search term is not invalid
      if (searchTerm != "" && searchTerm != undefined) {
        // Get matching lines
        let lines = getMatchingLines(editor, searchTerm);
        // If there are matching lines
        if (lines[0] != "") {
          if (mode == "cut" || mode == "copied") {
            // Write text to clipboard
            vscode.env.clipboard.writeText(String(lines[1]));
          }

          // Delete lines
          if (mode == "cut" || mode == "deleted") {
            editor.edit(function (builder) {
              for (let index = 0; index < lines[0].length; index++) {
                builder.delete(lines[0][index]);
              }
            });
          }
          if (shouldOpenNewTab == true) {
            openDocWithClipboardText();
          }

          // Inform user of success
          window.showInformationMessage(
            String(lines[0].length) + " lines were " + mode
          );
        } else {
          window.showInformationMessage("No match found");
        }
      } else {
        window.showErrorMessage("Empty search term");
      }
    } catch (e) {
      window.showErrorMessage(
        "Unable to complete action due to unexpected error " + e
      );
    }
  });
}

/**
 * Open new document with clipboard text pasted into it
 */
function openDocWithClipboardText() {
  try {
    // Set the title of the new document to Untitled
    let setting = vscode.Uri.parse(
      "untitled:Untitled - " +
        new Date().toTimeString().split(" ")[0] +
        " " +
        new Date().toDateString()
    );
    // Read clipboard text
    let clipboardText = vscode.env.clipboard.readText();
    // Register call back to paste into new doc
    clipboardText.then((text) => {
      vscode.workspace.openTextDocument(setting).then((a) => {
        vscode.window.showTextDocument(a, 1, false).then((e) => {
          e.edit((edit) => {
            edit.insert(new vscode.Position(0, 0), text);
          });
        });
      });
    });
  } catch (e) {
    vscode.window.showErrorMessage(
      "Unable to complete action due to unexpected error " + e
    );
  }
}

module.exports = {
  openDocWithClipboardText,
  commandsImplementation,
  getMatchingLines,
};
