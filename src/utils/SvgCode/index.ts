import { coordUnitWidth } from "utils/common/constants";
import { Range } from "utils/common/type";
import { Coord } from "utils/Grid/type";

export class SvgCode {
    private codeList: string[] = [];
    public constructor(public range: Range) {}
    public baseStyle: SvgBaseStyle = {
        fill: `rgba(0,0,255,15)`,
        "stroke-width": 1,
        stroke: `rgba(0,0,0,1)`,
        opacity: 0.2,
        "fill-opacity": 1,
        "stroke-opacity": 1
    };
    public rectStyle: SvgRectStyle = {
        ...this.baseStyle,
        rx: 0,
        ry: 0
    };
    public rect(range: Range, style?: Partial<SvgRectStyle>): SvgCode {
        const mergedStyle = _.merge(this.rectStyle, style);
        const argList: string[] = [
            `x="${range.xMin * coordUnitWidth}"`,
            `y="${range.yMin * coordUnitWidth}"`,
            `width="${(range.xMax - range.xMin) * coordUnitWidth}"`,
            `height="${(range.yMax - range.yMin) * coordUnitWidth}"`
        ];
        Object.entries(mergedStyle).forEach(([propertyKey, value]) => {
            argList.push(`${propertyKey}="${value}"`);
        });
        this.codeList.push(`<rect ${argList.join(" ")}/>`);
        return this;
    }
    public textStyle: SvgTextStyle = {
        ...this.baseStyle,
        fill: "white",
        stroke: "white",
        "font-size": coordUnitWidth
    };
    public text(text: string, pos: Coord, style?: Partial<SvgTextStyle>): SvgCode {
        const { x, y } = pos;
        const mergedStyle = _.merge(this.textStyle, style);
        const argList: string[] = [`x="${x * coordUnitWidth}"`, `y="${y * coordUnitWidth + mergedStyle["font-size"]}"`];
        Object.entries(mergedStyle).forEach(([propertyKey, value]) => {
            argList.push(`${propertyKey}="${value}"`);
        });
        this.codeList.push(`<text ${argList.join(" ")}>${text}</text>`);
        return this;
    }
    public code(): string {
        return `<svg
        width="${(this.range.xMax - this.range.xMin) * coordUnitWidth}"
        height="${(this.range.yMax - this.range.yMin) * coordUnitWidth}">
        ${this.codeList.join("")}
        </svg>`;
    }
}

export interface SvgBaseStyle {
    [name: string]: string | number;
    fill: string;
    "stroke-width": number;
    stroke: string;
    opacity: number;
    "fill-opacity": number;
    "stroke-opacity": number;
}

export interface SvgRectStyle extends SvgBaseStyle {
    rx: number;
    ry: number;
}

export interface SvgTextStyle extends SvgBaseStyle {
    "font-size": number;
}
