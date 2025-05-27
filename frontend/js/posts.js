// Use homePage from categ.js
let Fetching = true;
let scrollEnd = false;
let loadedPostIds = new Set(); // Keep track of loaded post IDs

// Helper functions to reduce complexity
function validateUserState(api, state) {
  if ((api === "likedPost" || api === "userPosts") && !state) {
    console.error("User must be logged in to view this section");
    return false;
  }
  return true;
}

function validateFilters(like, date, state) {
  if ((like !== "" || date !== "") && !state) return false;
  return !(date !== "" && date !== "ASC" && date !== "DESC") && 
         !(like !== "" && like !== "ASC" && like !== "DESC");
}

async function fetchPostLikeStatus(postId) {
  try {
    const respPostLike = await fetch(`/api/checklike?post_id=${postId}`);
    if (respPostLike.ok) {
      const respPostLikeJson = await respPostLike.json();
      if (respPostLikeJson !== null) {
        return respPostLikeJson.like === 1 ? "liked" : "disliked";
      }
    }
    return "";
  } catch (error) {
    console.error("Fetch failed:", error);
    return "";
  }
}

function renderPostHTML(postData, formattedDate, optLike, optDisLike) {
  return `
    <div class="myPosts" onclick="handlePostClick(event, ${postData.id})">
        <div class="postProfile" id="pid${postData.id}">
            <div class="postImg">
                <a><img src="/public/img/default.avif" alt=""></a>
            </div>
            <div class="usernameProfil">
                <div>${postData.username}</div>
                <div class="postDate">${formattedDate}&nbsp;&nbsp;<i class="fa-solid fa-boxes-stacked"></i>
                    ${postData.categories ? postData.categories : "General"}
                </div>
            </div>
        </div>
        <div class="postTitle">
            <h2>${postData.title || ""}</h2>
        </div>
        <div class="postContent">
            ${postData.content ? postData.content.replace(/\n/g, "</br>") : ""}
        </div>
        <div class="reaction" onclick="event.stopPropagation()">
            <div>
                <i id="pid${postData.id}l" onclick="postLike(${postData.id},'liked')" 
                   class="fa-regular fa-thumbs-up cursor ${optLike}"></i>&nbsp;
                <span id="pid${postData.id}ls">${postData.likes}</span>
            </div>
            <div>
                <i id="pid${postData.id}d" onclick="postLike(${postData.id},'disliked')" 
                   class="fa-regular fa-thumbs-down cursor ${optDisLike}"></i>&nbsp;
                <span id="pid${postData.id}ds">${postData.dislikes}</span>
            </div>
            <div>|</div>
            <div class="cursor">
                <i class="fa-regular fa-comment"></i>&nbsp;
                <span id="pid${postData.id}cs">${postData.comments}</span>
            </div>
        </div>
        <div id="c${postData.id}" class="none showComments">
            <div id="c${postData.id}l" class="comment">
                <div class="guestAddComment">
                    <h3>Log in or sign up to share your thoughts!</h3>
                    <a class="btn btnNotify">Log in</a>
                </div>
            </div>
            <div id="c${postData.id}a" class="comment addComment">
                <form class="addComForm" method="post" id="c${postData.id}af">
                    <div class="postProfile">
                        <!-- code added here in js -->
                    </div>
                    <div class="addpostTitle">
                        <input type="hidden" name="post_id" value="${postData.id}">
                        <textarea id="c${postData.id}con" maxlength="1000" type="text" 
                                name="content" placeholder="Write a comment..." onclick="event.stopPropagation()"></textarea>
                    </div>
                    <div onclick="event.stopPropagation()" class="postBtn">
                        <button class="btn btnNotify" type="submit" onclick="addComment('${postData.id}')">Add</button>
                    </div>
                </form>
            </div>
        </div>
    </div>`;
}

// Add the handlePostClick function
function handlePostClick(event, postId) {
    // Don't toggle if clicking inside comments section, interactive elements, or reaction section
    if (event.target.closest('.showComments') || 
        event.target.closest('a') || 
        event.target.closest('button') || 
        event.target.closest('textarea') ||
        event.target.closest('.reaction')) {
        return;
    }
    
    toggleComment(postId);
}

async function display_post(page, api, urlParams = {}) {
  const { like = "", date = "", category = "" } = urlParams;
  const { state } = await window.checkIfLoggedIn();

  // Immediately exit if user is not logged in - don't even attempt to fetch posts
  if (!state) {
    return;
  }
  
  if (!validateUserState(api, state) || !validateFilters(like, date, state)) {
    return;
  }

  const element = document.getElementById("centerHome");
  if (!element) return;

  try {
    const response = await fetch(
      `/api/${api}?page=${page}&categ=${category}&date=${date}&like=${like}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      }
    );
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error("Unauthorized access");
        return;
      }
      dangerError(response.status);
      return;
    }

    const postsData = await response.json();
    if (!postsData?.length) {
      if (page === 1) {
        element.innerHTML = `<div class="no-posts">There are no posts to show</div>`;
      }
      scrollEnd = true;
      return;
    }

    // Clear existing posts if this is the first page
    if (page === 1) {
      element.innerHTML = "";
      loadedPostIds.clear();
    }

    const options = { 
      year: "numeric", 
      month: "long", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    };

    // Create a document fragment for better performance
    const fragment = document.createDocumentFragment();
    const tempContainer = document.createElement('div');

    // Sort posts by created_at in descending order (newest first)
    postsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    for (const post of postsData) {
      // Use the actual ID from the backend (id field)
      const postId = post.id;
      
      // Skip if we've already loaded this post
      if (loadedPostIds.has(postId)) {
        continue;
      }
      
      loadedPostIds.add(postId);
      const formattedDate = new Date(post.created_at).toLocaleDateString("en-US", options);
      const likeStatus = state ? await fetchPostLikeStatus(postId) : "";
      
      // Use the temporary container to convert HTML string to DOM elements
      tempContainer.innerHTML = renderPostHTML(
        post,
        formattedDate,
        likeStatus === "liked" ? "liked" : "",
        likeStatus === "disliked" ? "disliked" : ""
      );
      
      // Move the post element to the fragment
      while (tempContainer.firstChild) {
        fragment.appendChild(tempContainer.firstChild);
      }
    }

    // Append all new posts at once
    element.appendChild(fragment);

    // If we received fewer posts than expected, we've reached the end
    if (postsData.length < 7) {
      scrollEnd = true;
    }

    Fetching = true;
  } catch (error) {
    console.error("Fetching posts failed:", error);
    Fetching = true; // Reset fetching state on error
  }
}

async function scrollHandler(api) {
  const element = document.getElementById("centerHome");
  if (
    element.scrollTop + element.clientHeight >= element.scrollHeight - 20 &&
    Fetching &&
    !scrollEnd
  ) {
    Fetching = false;
    try {
      window.homePage++;
      await display_post(window.homePage, api);
      Fetching = true;
    } catch (error) {
      console.error("Error loading more posts:", error);
      window.homePage--; // Revert page number if request failed
      Fetching = true;
    }
  }
}

document.getElementById("centerHome")
  .addEventListener("scroll", () => scrollHandler("filterPost"));

  async function displayCategory() {
    const checkbx = document.getElementById('checkboxes');
    if (!checkbx) {
      console.error("Checkbox container not found!");
      return;
    }
  
    try {
      const response = await fetch('/api/categ');
      if (!response.ok) {
        dangerError(response.status)
        throw new Error('Failed to fetch categories');
      }
  
      const data = await response.json();
      if (data === null) {
        createAlert(alert("alert-caution", "No categories found"))
        return
      }
  
          // Define icons for each category
          const categoryIcons = {
              'General': 'fa-globe',
              'Fun': 'fa-gamepad',
              'Technology': 'fa-microchip',
              'Entertainment': 'fa-film',
              'Business': 'fa-briefcase',
              'News': 'fa-newspaper',
              'Zone01': 'fa-code'
          };
  
          // Sort categories alphabetically
          const sortedData = data.sort((a, b) => a.category.localeCompare(b.category));
          
      let checkboxHTML = '';
      for (const val of sortedData) {
              const icon = categoryIcons[val.category] || 'fa-tag';
        checkboxHTML += `<label>
                  <input type="checkbox" name="${val.category}" value="${val.category}" />
                                  <i class="fa-solid ${icon}"></i>
                                  ${val.category}
                </label>`;
      }
      checkbx.innerHTML = checkboxHTML;
    } catch (err) {
      createAlert(alert("alert-danger", "Failed to display categories"))
      console.error('Error:', err);
    }
  }
  
async function showCreatePostPopup() {
    // Show the popup with a smooth animation
    document.getElementById('popBackground').classList.remove('none');
    document.getElementById('popCreate').classList.remove('none');
    
    // Reset form fields
    document.getElementById('TitleCreatePost').value = '';
    document.getElementById('ContentCreatePost').value = '';
    document.querySelectorAll('#checkboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    // Load categories
    await displayCategory();
    
    // Add username to the post profile section
    const { state, username } = await window.checkIfLoggedIn();
    if (state) {
        const postProfile = document.querySelector('#CreatePostForm .postProfile');
        postProfile.innerHTML = `
            <div class="postImg">
                <img src="/public/img/default.avif" alt="Profile picture">
            </div>
            <div class="usernameProfil">
                <div>${username}</div>
            </div>
        `;

        // Focus the title input
        setTimeout(() => {
            document.getElementById('TitleCreatePost').focus();
        }, 300);
    }
}

// Update the toggleMenu function to handle the popup correctly
function toggleMenu(back, create) {
    const backElement = document.getElementById(back);
    const createElement = document.getElementById(create);
    
    if (backElement && createElement) {
        if (createElement.classList.contains('none')) {
            // Show popup
            backElement.classList.remove('none');
            createElement.classList.remove('none');
            
            // Reset scroll position
            if (create === 'popCreate') {
                createElement.querySelector('.addPost').scrollTop = 0;
            }
        } else {
            // Hide with animation
            createElement.classList.add('hiding');
            backElement.classList.add('hiding');
            
            // Remove elements after animation
            setTimeout(() => {
                createElement.classList.remove('hiding');
                backElement.classList.remove('hiding');
                createElement.classList.add('none');
                backElement.classList.add('none');
                
                // Clear form if closing create post popup
                if (create === 'popCreate') {
                    document.getElementById('TitleCreatePost').value = '';
                    document.getElementById('ContentCreatePost').value = '';
                    document.querySelectorAll('#checkboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
                }
            }, 200);
        }
    }
}
  
//   send request to api creat post and check response
document.getElementById('CreatePostForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()

    const title = document.getElementById("TitleCreatePost");
    const content = document.getElementById("ContentCreatePost");
    const checkboxes = document.querySelectorAll('#checkboxes input[type="checkbox"]');

    let category = []
    checkboxes.forEach((item) => {
        if (item.checked) {
            category.push(item.value)
        }
    });
    if (title.value === "" && content.value === "") {
        createAlert(alert("alert-caution", "You can't create empty post"))
        return
    }

    const formData = new FormData();
    formData.append('title', title.value);
    formData.append('content', content.value);
    formData.append('category', JSON.stringify(category));

    try {
        const respFetch = await fetch("/api/create-post", {
            method: 'POST',
            body: formData
        })
        let response = await respFetch.json()

        // check error status code
        if (!respFetch.ok) {
            dangerError(respFetch.status)
            throw new Error(response)
        }

        // if all work like good 
        const { username } = await window.checkIfLoggedIn();
        const newPost = {
            id: Date.now(), // Temporary ID until page refresh
            username: username,
            title: title.value,
            content: content.value,
            categories: category.join(", ") || "General",
            created_at: new Date().toISOString(),
            likes: 0,
            dislikes: 0,
            comments: 0
        };

        // Create new post HTML and add it to the top of the posts list
        const element = document.getElementById("centerHome");
        if (element) {
            const tempContainer = document.createElement('div');
            const formattedDate = new Date().toLocaleDateString("en-US", { 
                year: "numeric", 
                month: "long", 
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });

            tempContainer.innerHTML = renderPostHTML(newPost, formattedDate, "", "");
            
            // Insert the new post at the top of the list
            if (element.firstChild) {
                element.insertBefore(tempContainer.firstChild, element.firstChild);
            } else {
                element.appendChild(tempContainer.firstChild);
            }
        }

        // Clear the form and close the popup
        title.value = "";
        content.value = "";
        checkboxes.forEach((item) => item.checked = false);
        document.getElementById('checkboxes').classList.add("none")
        toggleMenu('popBackground', 'popCreate');
        createAlert(alert("alert-success", response));

    } catch (err) {
        createAlert(alert("alert-danger", "failed to create post"))
        console.error(err)
    }
})

async function logout() {
    try {
        const resp = await fetch("/api/logout");
        const valResp = await resp.json();
        
        if (!resp.ok) {
            if (resp.status === 401) {
                // Already logged out, just update UI
                window.state = false;
                window.username = "";
                clearAllNotifications(); // Clear notifications when logging out
                checkLogedAndaddPopup();
                return;
            }
            dangerError(resp.status);
            throw new Error('Logout failed');
        }

        // Clear state before closing WebSocket to avoid race conditions
        window.state = false;
        window.username = "";
        
        // Clear all notifications when logging out
        clearAllNotifications();
        
        // Close WebSocket if it exists
        if (typeof closeWS === 'function') {
            closeWS();
        }
        
        isMoerUsers = true;
        createAlert(alert("alert-success", valResp));
        
        // Update UI after short delay to ensure state is cleared
        await new Promise(resolve => setTimeout(resolve, 100));
        checkLogedAndaddPopup();
    } catch (err) {
        createAlert(alert("alert-danger", "Failed to logout"));
        console.error(err);
    }
}
  
async function postLike(PostID, typeLike) {
    const { state, _ } = await window.checkIfLoggedIn();
    if (!state){
        createAlert(alert("alert-danger", "You need to Login"))
        checkLogedAndaddPopup()
        return
    }

    let statusLike = 0
    let iLike = document.getElementById('pid' + PostID + 'l') 
    let idisLike = document.getElementById('pid' + PostID + 'd')
    let spanLike = document.getElementById('pid' + PostID + 'ls')
    let spanDislike = document.getElementById('pid' + PostID + 'ds')
    if (typeLike == "liked") {
        if (iLike.classList.contains('liked')) {
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
        if (idisLike.classList.contains('disliked')) {
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
        createAlert(alert("alert-danger", "Failed to get post reactions"))
        return
    }
    try {
        const response = await fetch(`/api/reactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `item_id=${PostID}&status_like=${statusLike}&item_type=post`
        });

        if (response.status == 401) {
            checkLogedAndaddPopup()
            return
        }
        if (!response.ok) {
            console.log("error")
            dangerError(response.status)
            return
        }

    } catch (error) {
        console.error("Fetch failed:", error);
        createAlert(alert("alert-danger", "Failed to get post reactions"))
    }
}