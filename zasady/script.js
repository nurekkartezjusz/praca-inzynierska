let current = 0;
const papers = document.querySelectorAll(".paper");
const total = papers.length;
let timeoutId = null;
function nextPage() {
    if (current < total) {
        clearTimeout(timeoutId);
        papers.forEach(p => p.style.visibility = "visible");
        finishAnimations();
        const paper = papers[current];
        paper.classList.add("flipped");
        paper.style.zIndex = 100 + current; 
        current++;
        timeoutId = setTimeout(() => {
            updateBookState();
        }, 1000);
    }
}
function prevPage() {
    if (current > 0) {
        clearTimeout(timeoutId);
        papers.forEach(p => p.style.visibility = "visible");
        finishAnimations();
        current--;
        const paper = papers[current];
        paper.classList.remove("flipped");
        paper.style.zIndex = 100 + (total - current); 
        timeoutId = setTimeout(() => {
            updateBookState();
        }, 1000);
    }
}
function finishAnimations() {
    papers.forEach((paper) => {
        paper.style.transition = "none";
        void paper.offsetWidth;
        paper.style.transition = "transform 1s cubic-bezier(.645, .045, .355, 1)";
    });
}
function updateBookState() {
    papers.forEach((paper, index) => {
        if (index < current) {
            paper.style.zIndex = index + 1;
        } else {
            paper.style.zIndex = total - index;
        }
        if (current === 0) {
            paper.style.visibility = (index === 0) ? "visible" : "hidden";
            if (index === 0) paper.style.zIndex = 100;
        } else if (current === total) {
            paper.style.visibility = (index === total - 1) ? "visible" : "hidden";
            if (index === total - 1) paper.style.zIndex = 100;
        } else {
            paper.style.visibility = "visible";
        }
    });
}
updateBookState();