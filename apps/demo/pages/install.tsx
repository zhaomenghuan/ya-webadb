import { DefaultButton, ProgressIndicator, Stack } from "@fluentui/react";
import { AdbSyncMaxPacketSize } from "@yume-chan/adb";
import { makeAutoObservable, observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import React from "react";
import { global } from "../state";
import { chunkFile, pickFile, RouteStackProps } from "../utils";

enum Stage {
    Uploading,

    Installing,

    Completed,
}

interface Progress {
    filename: string;

    stage: Stage;

    uploadedSize: number;

    totalSize: number;

    value: number | undefined;
}

class InstallPageState {
    installing = false;

    progress: Progress | undefined = undefined;

    constructor() {
        makeAutoObservable(this, {
            progress: observable.ref,
            install: false,
        });
    }

    install = async () => {
        const file = await pickFile({ accept: '.apk' });
        if (!file) {
            return;
        }

        runInAction(() => {
            this.installing = true;
            this.progress = {
                filename: file.name,
                stage: Stage.Uploading,
                uploadedSize: 0,
                totalSize: file.size,
                value: 0,
            };
        });

        await global.device!.install(chunkFile(file, AdbSyncMaxPacketSize), uploaded => {
            runInAction(() => {
                if (uploaded !== file.size) {
                    this.progress = {
                        filename: file.name,
                        stage: Stage.Uploading,
                        uploadedSize: uploaded,
                        totalSize: file.size,
                        value: uploaded / file.size * 0.8,
                    };
                } else {
                    this.progress = {
                        filename: file.name,
                        stage: Stage.Installing,
                        uploadedSize: uploaded,
                        totalSize: file.size,
                        value: 0.8,
                    };
                }
            });
        });

        runInAction(() => {
            this.progress = {
                filename: file.name,
                stage: Stage.Completed,
                uploadedSize: file.size,
                totalSize: file.size,
                value: 1,
            };
            this.installing = false;
        });
    };
}

const state = new InstallPageState();

const Install: NextPage = () => {
    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>Install APK - WebADB</title>
            </Head>

            <Stack horizontal>
                <DefaultButton
                    disabled={!global.device || state.installing}
                    text="Open"
                    onClick={state.install}
                />
            </Stack>

            {state.progress && (
                <ProgressIndicator
                    styles={{ root: { width: 300 } }}
                    label={state.progress.filename}
                    percentComplete={state.progress.value}
                    description={Stage[state.progress.stage]}
                />
            )}
        </Stack>
    );
};

export default observer(Install);
