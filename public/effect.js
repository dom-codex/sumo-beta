const uid = document.querySelector('#uid');
const chat = document.querySelector(".chatlist");
const close = document.querySelector(".close");
const link = document.querySelector("#link");

close.addEventListener("click", () => {
  document.querySelector(".modal").style.display = "none";
});
