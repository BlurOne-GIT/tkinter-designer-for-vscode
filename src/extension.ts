// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import exp = require('constants');
import { TreeDataProvider } from 'vscode';
import { TreeItem } from 'vscode';
import { WebviewViewProvider } from 'vscode';
import { FigmaAuthenticationProvider } from './figmaAuth';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "tkinter-designer-for-vscode" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('tkinter-designer-for-vscode.signIn', async () => {
		const session = await vscode.authentication.getSession("Figma", [], { createIfNone: true });
		console.log(session);
	});



	//vscode.window.registerWebviewViewProvider('generator-settings', new GenSetViewProvider());

	context.subscriptions.push(disposable);

	context.subscriptions.push(
		new FigmaAuthenticationProvider(context)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('tkinter-designer-for-vscode.openWebview', () => {
			const panel = vscode.window.createWebviewPanel(
				'figmaWebview',
				'Figma',
				vscode.ViewColumn.One,
				{}
			);
		
			// Set the webview HTML content
			panel.webview.html = `
				<!DOCTYPE html>
				<html>
					<head>
						<meta charset="UTF-8">
						<meta name="viewport" content="width=device-width, initial-scale=1.0">
						<title>Figma</title>
					</head>
					<body>
						<iframe src="https://www.figma.com" style="width: 100%; height: 100%; border: none;"></iframe>
					</body>
				</html>
			`;
		})
	);

	
}

// This method is called when your extension is deactivated
export function deactivate() {}

const getFigmaSession = async () => {
	const session = await vscode.authentication.getSession("Figma", ['profile'], { createIfNone: false });
};

export async function isLoggedIn() {
	const session = await vscode.authentication.getSession("Figma", ['profile'], { createIfNone: false });
	return session !== undefined;
}