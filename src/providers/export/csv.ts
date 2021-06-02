import _, { floor } from "lodash";
import { ExportProvider } from "./exportProvider";
import { IProject, IExportProviderOptions, AssetState } from "../../models/applicationState";
import Guard from "../../common/guard";
import HtmlFileReader from "../../common/htmlFileReader";
import json2csv, { Parser } from "json2csv";
import { toast } from "react-toastify";
import { refreshApplicationAction, reloadApplication } from "../../redux/actions/applicationActions";


import IApplicationActions, * as applicationActions from "../../redux/actions/applicationActions";
import IProjectActions, * as projectActions from "../../redux/actions/projectActions";
import { EDITOR_PAGE_INSTANCE } from "../../react/components/pages/editorPage/editorPage";
import { EDITOR_SIDEBAR_INSTANCE } from "../../react/components/pages/editorPage/editorSideBar";

/**
 * Options for CSV Export Provider
 */
export interface ICsvExportProviderOptions extends IExportProviderOptions {
    /** Whether or not to include binary assets in target connection */
    includeImages: boolean;
}

/**
 * @name - CSV Format Export Provider
 * @description - Exports a project into a single CSV file that include all configured assets
 */
export class CsvExportProvider extends ExportProvider<ICsvExportProviderOptions> {
    constructor(project: IProject, options: ICsvExportProviderOptions) {
        super(project, options);
        Guard.null(options);
    }

    /**
     * Export project to CSV
     */
    public async export(): Promise<void> {
        const results = await this.getAssetsForExport();
        const dataItems = [];

        for (const assetMetadata of results) {
            const assetProps = await HtmlFileReader.readAssetAttributes(assetMetadata.asset);

            // Check for out of bounds boxes
            console.log("Export check")
            let skipAsset = false
            for (const reg of assetMetadata.regions) {
                for (const tag of reg.tags) {
                    const maxx = reg.boundingBox.left + reg.boundingBox.width
                    const maxy = reg.boundingBox.top + reg.boundingBox.height
                    const W = assetProps.width
                    const H = assetProps.height
                    if (maxx > W || maxy > H) {
                         console.log(maxx + "/" + W + " | " + maxy + "/" + H + "  " + assetMetadata.asset.name)
                        skipAsset = true
                        break
                    }
                }
                if (skipAsset) break
            }

            if (skipAsset) {
                for (const ar of assetMetadata.regions) { assetMetadata.regions.pop() }
                assetMetadata.asset.state = AssetState.NotVisited
                this.assetService.save(assetMetadata)
                EDITOR_SIDEBAR_INSTANCE.onAssetClicked(assetMetadata.asset)
                const err = "Out Of bounds" + assetMetadata.asset.name
                console.log(err)
                toast.error(err, { autoClose: 15000 })
                continue
            }

            if (assetMetadata.asset.size.width != assetProps.width ||
                assetMetadata.asset.size.height != assetProps.height) {
                const err = "Resized image " + assetMetadata.asset.name
                for (const ar of assetMetadata.regions) { assetMetadata.regions.pop() }
                assetMetadata.asset.state = AssetState.NotVisited
                this.assetService.save(assetMetadata)
                EDITOR_SIDEBAR_INSTANCE.onAssetClicked(assetMetadata.asset)
                console.log(err)
                toast.error(err, { autoClose: 15000 })
                continue
            }

            if (this.options.includeImages) {
                // Write Image
                const arrayBuffer = await HtmlFileReader.getAssetArray(assetMetadata.asset);
                const assetFilePath = `vott-csv-export/${assetMetadata.asset.name}`;
                await this.storageProvider.writeBinary(assetFilePath, Buffer.from(arrayBuffer));
            }

            // Push CSV Records
            // The CSV file itself must have the following format::
            // image,xmin,ymin,xmax,ymax,label
            // image_1.jpg,26,594,86,617,cat
            // image_1.jpg,599,528,612,541,car
            // image_2.jpg,393,477,430,552,dog
            assetMetadata.regions.forEach((region) => {
                region.tags.forEach((tag) => {
                    const dataItem = {
                        image: assetMetadata.asset.name,
                        xmin: region.boundingBox.left,
                        ymin: region.boundingBox.top,
                        xmax: region.boundingBox.left + region.boundingBox.width,
                        ymax: region.boundingBox.top + region.boundingBox.height,
                        label: tag,
                    };

                    dataItems.push(dataItem);
                });
            });
        }

        // Configure CSV options
        const csvOptions: json2csv.Options<{}> = {
            fields: ["image", "xmin", "ymin", "xmax", "ymax", "label"],
        };
        const csvParser = new Parser(csvOptions);
        const csvData = csvParser.parse(dataItems);

        // Save CSV
        const fileName = `vott-csv-export/${this.project.name.replace(/\s/g, "-")}-export.csv`;
        await this.storageProvider.writeText(fileName, csvData);
    }
}
