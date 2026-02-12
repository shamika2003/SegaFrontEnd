function TypingIndicator() {
    return (
        <div
            className="typing ms-4"
            style={{
                "--c1": "rgb(0, 229, 255)",
                "--c2": "rgb(124, 77, 255)",
                "--c3": "rgb(0, 255, 163)",
            } as React.CSSProperties}

        >
            <span />
            <span />
            <span />
        </div>


    );
}

export default TypingIndicator;

