import * as vscode from 'vscode';
import * as state from './state';
import * as util from './utilities';
import * as config from './config';
import status from './status';
import { get_state_value } from 'shadow-cljs/calva.state';
import { getSession, getReplSessionTypeFromState } from './nrepl/repl-session';

const connectionStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
const typeStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
const cljsBuildStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
const prettyPrintToggle = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
const color = {
    active: "white",
    inactive: "#b3b3b3"
};

function colorValue(section: string, currentConf: vscode.WorkspaceConfiguration): string {
    let { defaultValue, globalValue, workspaceFolderValue, workspaceValue } = currentConf.inspect(section);
    return (workspaceFolderValue || workspaceValue || globalValue || defaultValue) as string;
}

function update(context = state.extensionContext) {

    let currentConf = vscode.workspace.getConfiguration('calva.statusColor');

    let doc = util.getDocument({}),
        fileType = util.getFileType(doc),
        cljsBuild = get_state_value('cljsBuild');

    const replTypeNames = {
        clj: "Clojure",
        cljs: "ClojureScript"
    };

    //let disconnectedColor = "rgb(192,192,192)";

    const pprint = config.getConfig().prettyPrintingOptions.enabled;
    prettyPrintToggle.text = "pprint";
    prettyPrintToggle.color = pprint ? undefined : color.inactive;
    prettyPrintToggle.tooltip = `Turn pretty printing ${pprint ? 'off' : 'on'}`
    prettyPrintToggle.command = "calva.togglePrettyPrint"

    typeStatus.command = null;
    typeStatus.text = "Disconnected";
    typeStatus.tooltip = "No active REPL session";
    typeStatus.color = colorValue("disconnectedColor", currentConf);

    connectionStatus.command = null;
    connectionStatus.tooltip = "REPL connection status";

    cljsBuildStatus.text = null;
    cljsBuildStatus.command = "calva.switchCljsBuild";
    cljsBuildStatus.tooltip = null;

    if (get_state_value('connected')) {
        connectionStatus.text = "nREPL $(zap)";
        connectionStatus.color = colorValue("connectedStatusColor", currentConf);
        connectionStatus.tooltip = `nrepl://${get_state_value('hostname')}:${get_state_value('port')} (Click to reset connection)`;
        connectionStatus.command = "calva.startOrConnectRepl";
        typeStatus.color = colorValue("typeStatusColor", currentConf);
        const replType = getReplSessionTypeFromState();
        if (replType !== null) {
            typeStatus.text = ['cljc', config.REPL_FILE_EXT].includes(fileType) ? `cljc/${replType}` : replType;
            if (getSession('clj') !== null && getSession('cljs') !== null) {
                typeStatus.command = "calva.toggleCLJCSession";
                typeStatus.tooltip = `Click to use ${(replType === 'clj' ? 'cljs' : 'clj')} REPL for cljc`;
            } else {
                typeStatus.tooltip = `Connected to ${replTypeNames[replType]} REPL`;
            }
        }
        if (replType === 'cljs' && state.extensionContext.workspaceState.get('cljsReplTypeHasBuilds')) {
            if (cljsBuild !== null && replType === 'cljs') {
                cljsBuildStatus.text = cljsBuild;
                cljsBuildStatus.tooltip = "Click to switch CLJS build REPL";
            } else if (cljsBuild === null) {
                cljsBuildStatus.text = "No build connected"
                cljsBuildStatus.tooltip = "Click to connect to a CLJS build REPL";
            }
        }
    } else if (util.getLaunchingState()) {
        connectionStatus.color = colorValue("launchingColor", currentConf);
        connectionStatus.text = "Launching REPL using " + util.getLaunchingState();
        connectionStatus.tooltip = "Click to interrupt jack-in or Connect to REPL Server";
        connectionStatus.command = "calva.disconnect";
    } else if (util.getConnectingState()) {
        connectionStatus.text = "nREPL - trying to connect";
        connectionStatus.tooltip = "Click to interrupt jack-in or Connect to REPL Server";
        connectionStatus.command = "calva.disconnect";
    } else {
        connectionStatus.text = "nREPL $(zap)";
        connectionStatus.tooltip = "Click to jack-in or Connect to REPL Server";
        connectionStatus.color = colorValue("disconnectedColor", currentConf);
        connectionStatus.command = "calva.startOrConnectRepl";
    }
    if (status.shouldshowReplUi(context)) {
        connectionStatus.show();
        typeStatus.show();
        if (cljsBuildStatus.text) {
            cljsBuildStatus.show();
        } else {
            cljsBuildStatus.hide();
        }
        prettyPrintToggle.show();
    } else {
        connectionStatus.hide();
        typeStatus.hide();
        cljsBuildStatus.hide();
        prettyPrintToggle.hide();
    }
}

export default {
    update,
    color
};
