import { ICommandBarItemProps, Stack } from '@fluentui/react';
import { AdbFrameBuffer } from "@yume-chan/adb";
import { action, autorun, computed, makeAutoObservable } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import React, { useCallback, useEffect, useRef } from 'react';
import { CommandBar, DemoMode, DeviceView } from '../components';
import { global } from "../state";
import { Icons, RouteStackProps } from "../utils";

class FrameBufferState {
    width = 0;
    height = 0;
    imageData: ImageData | undefined = undefined;
    demoModeVisible = false;

    constructor() {
        makeAutoObservable(this, {
            toggleDemoModeVisible: action.bound,
        });
    }

    setImage(image: AdbFrameBuffer) {
        this.width = image.width;
        this.height = image.height;
        this.imageData = new ImageData(image.data, image.width, image.height);
    }

    toggleDemoModeVisible() {
        this.demoModeVisible = !this.demoModeVisible;
    }
}

const state = new FrameBufferState();

const FrameBuffer: NextPage = (): JSX.Element | null => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const capture = useCallback(async () => {
        if (!global.device) {
            return;
        }

        try {
            const framebuffer = await global.device.framebuffer();
            state.setImage(framebuffer);
        } catch (e) {
            global.showErrorDialog(e instanceof Error ? e.message : `${e}`);
        }
    }, []);

    useEffect(() => {
        return autorun(() => {
            const canvas = canvasRef.current;
            if (canvas && state.imageData) {
                canvas.width = state.width;
                canvas.height = state.height;
                const context = canvas.getContext("2d")!;
                context.putImageData(state.imageData, 0, 0);
            }
        });
    }, []);

    const commandBarItems = computed(() => [
        {
            key: 'start',
            disabled: !global.device,
            iconProps: { iconName: Icons.Camera, style: { height: 20, fontSize: 20, lineHeight: 1.5 } },
            text: 'Capture',
            onClick: capture,
        },
        {
            key: 'Save',
            disabled: !state.imageData,
            iconProps: { iconName: Icons.Save, style: { height: 20, fontSize: 20, lineHeight: 1.5 } },
            text: 'Save',
            onClick: () => {
                const canvas = canvasRef.current;
                if (!canvas) {
                    return;
                }

                const url = canvas.toDataURL();
                const a = document.createElement('a');
                a.href = url;
                a.download = `Screenshot of ${global.device!.name}.png`;
                a.click();
            },
        },
    ]);

    const commandBarFarItems = computed((): ICommandBarItemProps[] => [
        {
            key: 'DemoMode',
            iconProps: { iconName: Icons.Wand, style: { height: 20, fontSize: 20, lineHeight: 1.5 } },
            checked: state.demoModeVisible,
            text: 'Demo Mode Settings',
            onClick: state.toggleDemoModeVisible,
        },
        {
            key: 'info',
            iconProps: { iconName: Icons.Info, style: { height: 20, fontSize: 20, lineHeight: 1.5 } },
            iconOnly: true,
            tooltipHostProps: {
                content: 'Use ADB FrameBuffer command to capture a full-size, high-resolution screenshot.',
                calloutProps: {
                    calloutMaxWidth: 250,
                }
            },
        }
    ]);

    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>Screen Capture - WebADB</title>
            </Head>

            <CommandBar items={commandBarItems.get()} farItems={commandBarFarItems.get()} />
            <Stack horizontal grow styles={{ root: { height: 0 } }}>
                <DeviceView width={state.width} height={state.height}>
                    <canvas ref={canvasRef} style={{ display: 'block' }} />
                </DeviceView>

                <DemoMode style={{ display: state.demoModeVisible ? 'block' : 'none' }} />
            </Stack>
        </Stack>
    );
};

export default observer(FrameBuffer);
