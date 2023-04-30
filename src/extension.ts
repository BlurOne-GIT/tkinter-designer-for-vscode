// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import exp = require('constants');
import { TreeDataProvider } from 'vscode';
import { TreeItem } from 'vscode';
import { WebviewViewProvider } from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "tkinter-designer-for-vscode" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('tkinter-designer-for-vscode.titWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('I fucking love tits');
		isLoggedIn = true;
	});

	vscode.window.registerWebviewViewProvider('generator-settings', new GenSetViewProvider());

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

export var isLoggedIn: boolean = false;

export class GenSetViewProvider implements WebviewViewProvider
{
	resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>, token: vscode.CancellationToken): void | Thenable<void> {
		webviewView.webview.html =
		`<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
		</head>
		<body>
			<span>File link:</span>
			<input type="text">
		</body>
		</html>`;
	}
	
}