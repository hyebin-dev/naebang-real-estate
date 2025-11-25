// localStorage에서 게시글 목록 가져오기
function getPosts() {
  return JSON.parse(localStorage.getItem("customerPosts")) || [];
}

// 게시글 목록 저장하기
function savePosts(posts) {
  localStorage.setItem("customerPosts", JSON.stringify(posts));
}

// index.html 에서 목록 렌더링
function renderPostList() {
  const posts = getPosts();
  const container = document.getElementById("postList");
  container.innerHTML = "";

  if (posts.length === 0) {
    container.innerHTML = "<p>등록된 문의가 없습니다.</p>";
    return;
  }

  posts.forEach(post => {
    const div = document.createElement("div");
    div.className = "post";
    div.innerHTML = `
      <div class="post-title">${post.title}</div>
      <div class="post-name">${localStorage.getItem('name')}</div>
      <div class="post-date">${post.date}</div>
    `;
    div.addEventListener("click", () => {
      location.href = `cust_1.html?id=${post.id}`;
    });
    container.appendChild(div);
  });
}
