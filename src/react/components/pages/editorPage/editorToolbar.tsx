import React from "react";
import _ from "lodash";
import { IToolbarItemRegistration } from "../../../../providers/toolbar/toolbarItemFactory";
import IProjectActions from "../../../../redux/actions/projectActions";
import { IProject } from "../../../../models/applicationState";
import { IToolbarItemProps, ToolbarItem, ToolbarItemType } from "../../toolbar/toolbarItem";
import "./editorToolbar.scss";
import { ToolbarItemName } from "../../../../registerToolbar";

/**
 * Properties for Editor Toolbar
 * @member project - Current project being edited
 * @member actions - Actions to be performed on project
 * @member items - Registered Toolbar items
 */
export interface IEditorToolbarProps {
    project: IProject;
    actions: IProjectActions;
    items: IToolbarItemRegistration[];
    onToolbarItemSelected: (toolbarItem: ToolbarItem) => void;
}

/**
 * State of IEditorToolbar
 * @member selectedItem - Item selected from toolbar
 */
export interface IEditorToolbarState {
    selectedItem: ToolbarItemName;
}

/**
 * @name - Editor Toolbar
 * @description - Collection of buttons that perform actions in toolbar on editor page
 */
export class EditorToolbar extends React.Component<IEditorToolbarProps, IEditorToolbarState> {

    public state = {
        selectedItem: ToolbarItemName.SelectCanvas,
    };

    public render() {
        const groups = _(this.props.items)
            .groupBy("config.group")
            .values()
            .value();

        return (
            <div className="btn-toolbar" role="toolbar">
                {groups.map((items, idx) =>
                    <div key={idx} className="btn-group mr-2" role="group">
                        {items.map((registration) => {
                            const toolbarItemProps: IToolbarItemProps = {
                                ...registration.config,
                                actions: this.props.actions,
                                project: this.props.project,
                                active: this.isComponentActive(this.state.selectedItem, registration),
                                onClick: this.onToolbarItemSelected,
                            };
                            const ToolbarItem = registration.component;

                            return <ToolbarItem key={toolbarItemProps.name} {...toolbarItemProps} />;
                        })}
                    </div>,
                )}

                <button type="button" id="reloadBtn" className="toolbar-btn" title="Verify image sizes"><i className="fas fa-check-double"></i></button>
                <button type="button" id="toggleTagsBtn" className="toolbar-btn" title="Toggle labels"><i id="lblTagsOn" className="fas fa-font"></i></button>
                <button type="button" id="downloadMetaBtn" className="toolbar-btn saveProject" title="Refresh tags"><i className="fas fa-sync"></i></button>
                <input type="text" id="filter" name="filter" className="inputBox w250" placeholder="filter by filename" onKeyUp={this.keyUpHandler} />
                <input type="text" id="filterByTag" name="filterByTag" className="inputBox w125" placeholder="filter by tag" />

            </div>
        );
    }

    private onToolbarItemSelected = (toolbarItem: ToolbarItem) => {
        this.setState({
            selectedItem: toolbarItem.props.name,
        }, () => {
            this.props.onToolbarItemSelected(toolbarItem);
        });
    }

    keyUpHandler(e) {
        if (e.keyCode === 13)
            console.log(e.target.value)
    }


    private isComponentActive(selected: ToolbarItemName, componentRegistration: IToolbarItemRegistration) {
        return selected
            ? selected === componentRegistration.config.name &&
            componentRegistration.config.type === ToolbarItemType.State
            : false;
    }
}
