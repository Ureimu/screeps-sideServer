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
    public offset: Coord = { x: 0.5, y: 0.5 };
    public textOffset: Coord = { x: -0.25, y: -0.25 };
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
        "font-size": Math.round(coordUnitWidth * 0.75)
    };
    public text(text: string, pos: Coord, style?: Partial<SvgTextStyle>): SvgCode {
        const { x, y } = pos;
        const mergedStyle = _.merge(this.textStyle, style);
        const fontSize = mergedStyle["font-size"];
        const argList: string[] = [
            `x="${(x + this.offset.x) * coordUnitWidth + this.textOffset.x * fontSize}"`,
            `y="${(y + this.offset.y) * coordUnitWidth + this.textOffset.y * fontSize + fontSize / 2}"`
        ];
        Object.entries(mergedStyle).forEach(([propertyKey, value]) => {
            argList.push(`${propertyKey}="${value}"`);
        });
        this.codeList.push(`<text ${argList.join(" ")}>${text}</text>`);
        return this;
    }
    public circleStyle: SvgCircleStyle = {
        ...this.baseStyle,
        r: 0.5
    };
    public circle(pos: Coord | Coord[], style?: Partial<SvgCircleStyle>): SvgCode {
        if (_.isArray(pos)) {
            pos.forEach(coord => this.circle(coord));
            return this;
        } else {
            const { x, y } = pos;
            const mergedStyle = _.merge(this.circleStyle, style);
            const argList: string[] = [
                `cx="${(x + this.offset.x) * coordUnitWidth}"`,
                `cy="${(y + this.offset.y) * coordUnitWidth}"`,
                `r="${mergedStyle.r * coordUnitWidth}"`
            ];
            Object.entries(mergedStyle).forEach(([propertyKey, value]) => {
                if (propertyKey === "r") return;
                argList.push(`${propertyKey}="${value}"`);
            });
            this.codeList.push(`<circle ${argList.join(" ")}/>`);
            return this;
        }
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

export interface SvgCircleStyle extends SvgBaseStyle {
    r: number;
}
