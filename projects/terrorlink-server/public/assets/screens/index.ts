import "./index.css"

let currentScreen: string
export function setScreen(id: string) {
    if (id === getScreen()) return;

    const otherScreens = document.querySelectorAll(`div[screen]:not(div[screen=${id}])`) as NodeListOf<HTMLElement>;
    const screen = document.querySelector(`div[screen=${id}]`) as HTMLElement;

    if (!screen) {
        throw new Error(`Screen ${id} not found`);
    }

    otherScreens.forEach(screen => { screen.style.display = "none" });
    screen.style.display = "";
    currentScreen = id;
}

export function getScreen() {
    return currentScreen;
}

document.addEventListener("DOMContentLoaded", () => {
    setScreen("loading")
})