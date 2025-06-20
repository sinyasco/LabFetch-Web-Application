// sendAuthor.js

async function sendAuthorName(firstname, lastname) {
    const response = await fetch("http://localhost:5001/getScholarData", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ firstname, lastname })
    });

    const data = await response.json();
    console.log(data);
}
