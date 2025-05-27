async function toggleComment(sectionComment) {
    const element = document.getElementById("c" + sectionComment);

    const commentIconContainer = document.querySelector(`#pid${sectionComment} .reaction div:last-child`);
    
    element.classList.toggle("active");
    element.classList.toggle("none");
    
    if (element.classList.contains("active")) {

        const { state, username } = await window.checkIfLoggedIn();

        if (state === null) return;

        if (commentIconContainer) {
            commentIconContainer.style.color = 'var(--so-accent-blue)';
        }

        if (state) {
            document.getElementById("c" + sectionComment + "l").classList.add("none");
            const parentAdd = document.getElementById("c" + sectionComment + "a");
            const usernameAdd = parentAdd.querySelector('.postProfile');
            usernameAdd.innerHTML = `
                <a class="postImg" href="/profil?username=${username}"><img src="/public/img/default.avif"
                        alt=""></a>
                <div class="usernameProfil">${username}</div>
            `;
        } else {
            document.getElementById("c" + sectionComment + "a").classList.add("none");
        }

        await fetchComments(sectionComment, 1);
    } else {
        if (commentIconContainer) {
            commentIconContainer.style.color = '';
        }
    }
}


async function fetchComments(sectionComment, page) {
    const element = document.getElementById("c" + sectionComment);
    const seeMore = document.getElementById("c" + sectionComment + "sm");
    if (seeMore) {
        seeMore.disabled = true;
        seeMore.innerHTML = "Loading...";
    }
    try {
        let flagSeeMore = true
        const seeMore = await fetch(`/api/getComments?page=${page + 1}&post_id=${sectionComment}`)
        const response = await fetch(`/api/getComments?page=${page}&post_id=${sectionComment}`)
        if (!response.ok || !seeMore.ok) {
            dangerError(response.status)
            return
        }
        const comments = await response.json()
        const seeMoreComments = await seeMore.json()

        if (page === 1) {
            if (element) {
                const childDivs = Array.from(element.children)
                childDivs.slice(2).forEach(div => div.remove())
            }
        } else {
            await delay(1000)
            element.removeChild(element.lastElementChild)
        }

        if (seeMoreComments === null) {
            flagSeeMore = false
        }

        if (comments === null) {
            return
        }

        for (const comment of comments) {
            const date = new Date(comment.created_at);
            const options = { year: "numeric", month: "long", day: "numeric" };
            const formattedDate = date.toLocaleDateString("en-US", options);
            let optLike = ""
            let optDisLike = ""
            const { state, _ } = await window.checkIfLoggedIn();
            if (state) {
                try {
                    const respCommLike = await fetch(`/api/check-comment-like?comment_id=${comment.id}`)
                    if (respCommLike.ok) {
                        const respCommLikeJson = await respCommLike.json()
                        if (respCommLikeJson !== null) {
                            if (respCommLikeJson.like === 1) {
                                optLike = "liked"
                            } else {
                                optDisLike = "disliked"
                            }
                        }
                    } else {
                        dangerError(respCommLike.status)
                    }
                } catch (error) {
                    console.error("Fetch failed:", error);
                    createAlert(alert("alert-danger", "Failed to get comments"))
                }
            }
            element.innerHTML += `
            <div class="comment">
                <div class="postProfile">
                    <a class="postImg" href="/profil?username=${comment.user_name}"><img src="/public/img/default.avif"
                        alt=""></a>
                    <div class="usernameProfil">
                        <div>${comment.user_name}</div>
                        <div class="postDate">${formattedDate}</div>
                    </div>
                </div>
                <div class="postContent">
                    ${comment.comment_content.replace(/\n/g, '</br>')}
                </div>
                <div id="cid${comment.id}" class="reaction">
                    <div>
                        <i id="cid${comment.id}l" onclick="commentLike(${comment.id},'liked')" class="fa-regular fa-thumbs-up cursor ${optLike}"></i>&nbsp;<span id="cid${comment.id}ls">${comment.like}</span>
                    </div>
                    <div>
                        <i id="cid${comment.id}d" onclick="commentLike(${comment.id},'disliked')" class="fa-regular fa-thumbs-down cursor ${optDisLike}"></i>&nbsp;<span id="cid${comment.id}ds">${comment.dislike}</span>
                    </div>
                </div>
            </div>
            `
        }
        if (flagSeeMore) {
            element.innerHTML += `
            <div>
                <button class="seeMoreBtn cursor" id="c${sectionComment}sm" onclick="fetchComments(${sectionComment}, ${page + 1})">See More
                    <i class="fa-solid fa-angle-down cursor"></i>
                </button>
            </div>
            `
        }
    } catch (error) {
        console.error("Fetch failed:", error);
        createAlert(alert("alert-danger", "Failed to get comments"))
    }
}


function addComment(form) {
    const commentContent = document.getElementById("c" + form + "con").value
    const myAddForm = document.getElementById("c" + form + "af")

    myAddForm.addEventListener('submit', async (e) => {
        e.preventDefault()

        if (commentContent === "") {
            createAlert(alert("alert-caution", "empty field"))
            return
        }

        const addData = new FormData(myAddForm)
        try {
            const response = await fetch(`/api/addComment`, {
                method: 'POST',
                body: addData,
            })


            let data = await response.json()

            if (response.status != 201) {
                dangerError(response.status)

                createAlert(alert("alert-caution", data))

                return
            }

            let spanComment = document.getElementById('pid' + form + 'cs')
            spanComment.textContent = parseInt(spanComment.textContent) + 1

            // fetch comments for page 1
            await fetchComments(form, 1)
        } catch (error) {
            console.error("Fetch failed:", error);
            createAlert(alert("alert-danger", "Failed to add the comment"))
        }
    })

}

async function commentLike(commentID, typeLike) {
    const { state, _ } = await window.checkIfLoggedIn();
    if (!state) {
        createAlert(alert("alert-danger", "You need to Login"))
        checkLogedAndaddPopup()
        return
    }

    let statusLike = 0
    let iLike = document.getElementById('cid' + commentID + 'l')
    let idisLike = document.getElementById('cid' + commentID + 'd')
    let spanLike = document.getElementById('cid' + commentID + 'ls')
    let spanDislike = document.getElementById('cid' + commentID + 'ds')

    if (typeLike == "liked") {
        //if click like
        if (iLike.classList.contains('liked')) {
            //if already liked
            iLike.classList.remove('liked')
            spanLike.textContent = parseInt(spanLike.textContent) - 1
            statusLike = 0
        } else {
            if (idisLike.classList.contains('disliked')) {
                idisLike.classList.remove('disliked')
                spanDislike.textContent = parseInt(spanDislike.textContent) - 1
            }
            iLike.classList.add('liked')
            spanLike.textContent = parseInt(spanLike.textContent) + 1
            statusLike = 1
        }
    } else if (typeLike == "disliked") {
        //if click dislike
        if (idisLike.classList.contains('disliked')) {
            //if already disliked
            idisLike.classList.remove('disliked')
            spanDislike.textContent = parseInt(spanDislike.textContent) - 1
            statusLike = 0
        } else {
            if (iLike.classList.contains('liked')) {
                iLike.classList.remove('liked')
                spanLike.textContent = parseInt(spanLike.textContent) - 1
            }
            idisLike.classList.add('disliked')
            spanDislike.textContent = parseInt(spanDislike.textContent) + 1
            statusLike = -1
        }
    } else {
        createAlert(alert("alert-danger", "Failed to get comment reactions"))
        return
    }

    try {
        const response = await fetch('/api/reactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `item_id=${commentID}&status_like=${statusLike}&item_type=comment`
        });

        if (response.status === 401) {
            checkLogedAndaddPopup();
            return;
        }

        if (!response.ok) {
            dangerError(response.status);
            return;
        }

    } catch (error) {
        console.error("Fetch failed:", error);
        createAlert(alert("alert-danger", "Failed to update comment reactions"));
    }
}