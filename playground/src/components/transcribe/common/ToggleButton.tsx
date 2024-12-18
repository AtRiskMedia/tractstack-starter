import {memo} from "react";

export interface ToggleButtonProps {
    checkActive: () => boolean,
    onClick: () => void,
    activeClassName?: string,
    inactiveClassName?: string,
    text?: string,
}

export const ToggleButton = memo((props: ToggleButtonProps) => {
    const active = props.checkActive();
    return (
        <button className={active ? props.activeClassName : props.inactiveClassName}
                onClick={props.onClick}>
            {props.text}
        </button>
    );
});