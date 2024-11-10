"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const archiver_1 = __importDefault(require("archiver"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
async function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "NLS" is now active!');
    // 插件激活时显示介绍文档
    const markdownPath = path.join(context.extensionPath, 'README.md'); // 获取 Markdown 文件的路径
    // 输出路径，确保路径正确
    console.log("Markdown file path:", markdownPath);
    // 打开 Markdown 文件并显示
    vscode.workspace.openTextDocument(markdownPath).then(doc => {
        vscode.window.showTextDocument(doc, { preview: false });
    });
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    // const disposable = vscode.commands.registerCommand('NLS.helloWorld', () => {
    // 	// The code you place here will be executed every time your command is executed
    // 	// Display a message box to the user
    // 	vscode.window.showInformationMessage('Hello World from NLS:Natural-Level Synthesis for Hardware Implementation!');
    // });
    // 插件激活时，检查是否有 API key
    const isApiKeySet = await checkAndSetApiKey(context);
    const apiKey = context.globalState.get('openaiApiKey');
    const model = context.globalState.get('openaiModel');
    if (!isApiKeySet) {
        vscode.window.showErrorMessage('No API key provided. The extension will not function without it.');
        return; // 如果没有设置 API Key，停止插件继续执行
    }
    if (!model) {
        await selectModel(context);
    }
    // 注册添加 API Key 的命令
    let disposableAddApiKey = vscode.commands.registerCommand('verilogGenerator.addApiKey', async () => {
        const apiKey = await vscode.window.showInputBox({ prompt: 'Please enter your OpenAI API key' });
        if (apiKey) {
            context.globalState.update('openaiApiKey', apiKey);
            vscode.window.showInformationMessage('API key saved successfully.');
        }
        else {
            vscode.window.showErrorMessage('No API key provided.');
        }
    });
    // 注册选择模型的命令
    let disposableSelectModel = vscode.commands.registerCommand('verilogGenerator.selectModel', async () => {
        await selectModel(context);
    });
    // 注册生成 Verilog 代码的命令
    let disposableGenerateVerilog = vscode.commands.registerCommand('verilogGenerator.generateVerilog', async () => {
        // 获取用户输入的需求
        const userInput = await vscode.window.showInputBox({ prompt: 'Enter hardware description' });
        if (userInput) {
            // 调用 OpenAI API 生成 Verilog 代码
            const verilogCode = await generateVerilog(userInput, context);
            // 在新文档中显示生成的 Verilog 代码
            const document = await vscode.workspace.openTextDocument({ content: verilogCode, language: 'verilog' });
            vscode.window.showTextDocument(document);
        }
    });
    // 注册打包 Verilog 代码的命令
    let disposablePackage = vscode.commands.registerCommand('verilogGenerator.packageCode', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const filePath = document.uri.fsPath;
            // 打包文件
            packageCode(filePath);
        }
        else {
            vscode.window.showErrorMessage("No open Verilog file to package.");
        }
    });
    // 将所有命令添加到 context.subscriptions 中
    context.subscriptions.push(disposableAddApiKey, disposableSelectModel, disposableGenerateVerilog, disposablePackage);
}
// 检查并设置 API key
async function checkAndSetApiKey(context) {
    let apiKey = context.globalState.get('openaiApiKey');
    if (!apiKey) {
        apiKey = await vscode.window.showInputBox({ prompt: 'Please enter your OpenAI API key' });
        if (apiKey) {
            context.globalState.update('openaiApiKey', apiKey);
            vscode.window.showInformationMessage('API key saved successfully.');
            return true;
        }
        else {
            vscode.window.showErrorMessage('No API key provided. The extension will not function without it.');
            return false;
        }
    }
    return true;
}
// 让用户选择模型
async function selectModel(context) {
    // 定义第一级菜单选项
    const categories = ['OpenAI-o1', 'GPT-4o-mini', 'GPT-4o', 'GPT-4-turbo', 'GPT-4', 'GPT-3.5-turbo'];
    // 让用户选择第一级菜单
    const selectedCategory = await vscode.window.showQuickPick(categories, {
        placeHolder: 'Please select a model category'
    });
    if (selectedCategory) {
        // 根据用户选择的类别定义第二级菜单选项
        let models = [];
        switch (selectedCategory) {
            case 'OpenAI-o1':
                models = [
                    'o1-preview',
                    'o1-preview-2024-09-12',
                    'o1-mini',
                    'o1-mini-2024-09-12'
                ];
                break;
            case 'GPT-4o-mini':
                models = [
                    'gpt-4o-mini',
                    'gpt-4o-mini-2024-07-18'
                ];
                break;
            case 'GPT-4o':
                models = [
                    'gpt-4o',
                    'gpt-4o-2024-08-06',
                    'gpt-4o-2024-05-13',
                    'chatgpt-4o-latest'
                ];
                break;
            case 'GPT-4-turbo':
                models = [
                    'gpt-4-turbo',
                    'gpt-4-turbo-2024-04-09',
                    'gpt-4-turbo-preview',
                    'gpt-4-0125-preview',
                    'gpt-4-1106-preview'
                ];
                break;
            case 'GPT-4':
                models = [
                    'gpt-4',
                    'gpt-4-0613',
                    'gpt-4-0314'
                ];
                break;
            case 'GPT-3.5-turbo':
                models = [
                    'gpt-3.5-turbo-0125',
                    'gpt-3.5-turbo',
                    'gpt-3.5-turbo-1106',
                    'gpt-3.5-turbo-instruct'
                ];
                break;
        }
        // 第二级菜单选择
        const selectedModel = await vscode.window.showQuickPick(models, {
            placeHolder: `Please select a model from ${selectedCategory}`
        });
        if (selectedModel) {
            context.globalState.update('openaiModel', selectedModel);
            vscode.window.showInformationMessage(`Model ${selectedModel} selected.`);
        }
    }
}
// Use the function from OpenAI API to generate Verilog code
async function generateVerilog(prompt, context) {
    const apiKey = context.globalState.get('openaiApiKey');
    const model = context.globalState.get('openaiModel');
    if (!apiKey) {
        vscode.window.showErrorMessage('API key is missing.');
        return '';
    }
    if (!model) {
        vscode.window.showErrorMessage('The model has not been selected yet.');
        return '';
    }
    // 输出日志确认 API Key 和模型是否正确
    console.log("Sending request to OpenAI API...");
    console.log("API Key:", apiKey /*? "******" : "No API Key found"*/);
    console.log("Model:", model);
    console.log("Prompt:", prompt);
    try {
        // 使用正确的 API URL
        //https://api.openai.com/v1/completions 
        //https://developer.poe.com
        //API key: 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
        const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
            model: model, // 确保模型名称正确
            messages: [
                {
                    role: "system",
                    content: "You are an experienced hardware development engineer with proficiency in Verilog code writing. Your output will be what is saved directly in the .v file. Please write Verilog code for me as per the requirement and ALL non-code parts should be in the form of comments. ALL descriptions should be writen after //, and you don't need to add double quote at the beginning and the end of the output."
                },
                { role: 'user', content: prompt }
            ], // 用户输入的需求
            max_tokens: 2000, // 设置合适的令牌限制
            temperature: 0.7 // 控制生成的随机性，适当调整
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`, // 使用正确的 API 密钥
                'Content-Type': 'application/json',
            }
        });
        console.log("The response from the OpenAI API:", response.data); // 记录响应
        // 解析响应数据
        const data = response.data;
        const verilogCode = data.choices[0].message.content; // 获取生成的 Verilog 代码
        // 在新文档中显示生成的 Verilog 代码并保存
        const document = await vscode.workspace.openTextDocument({ content: verilogCode, language: 'verilog' });
        const filePath = path.join('E:', 'NLS', 'NLS', 'new_module.v'); // 指定文件路径
        // 将生成的代码保存到文件中
        await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(verilogCode, 'utf8'));
        vscode.window.showInformationMessage(`Verilog code has been saved to ${filePath}`);
        console.log(`Verilog code has been saved to ${filePath}`);
        // await vscode.window.showTextDocument(document);
        // await document.save(); // 确保文档被保存
        return verilogCode; // 返回生成的 Verilog 代码
    }
    catch (error) {
        const errorMessage = error.message || "Unknown error occurred";
        console.error("Error making request:", error);
        vscode.window.showErrorMessage("Failed to generate Verilog code: " + errorMessage);
        console.log("Failed to generate Verilog code: ", errorMessage);
        return '';
    }
}
function packageCode(filePath) {
    const output = fs.createWriteStream(filePath + '.zip');
    const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
    output.on('close', () => {
        vscode.window.showInformationMessage(`Packaged ${archive.pointer()} total bytes into ${filePath}.zip`);
    });
    archive.on('error', (err) => {
        throw err;
    });
    archive.pipe(output);
    archive.file(filePath, { name: path.basename(filePath) });
    archive.finalize();
}
// This method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map