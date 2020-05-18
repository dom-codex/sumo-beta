const uid = document.querySelector('#uid');
const chat = document.querySelector(".chatlist");
const close = document.querySelector(".close");
const link = document.querySelector("#link");
//link.addEventListener("click", () => {
  //document.querySelector(".modal").style.display = "block";
//});



//tell server you are online
/*socket.emit("identify",uid.value);
socket.on("online", (data) => {
  chat.innerHTML += `            
   <div class="chat list">
  <a href="#">
  <div class="liststyle">
  <div class="indicator"></div>
    <div class="names"><p>${data.name}</p></div></div>
    <div class="message"><small>11</small></div></a> `;
    //message room
  //const uid = document.querySelector('#uid');
   // socket.to(data.uid).emit('acknowledge',{uid:uid})
});*/
/* socket.on('onlinePal',(data)=>{
  
  data.forEach(user => {
    chat.innerHTML += `            
    <div class="chat list">
   <a href="#">
   <div class="liststyle">
   <div class="indicator"></div>
     <div class="names"><p>${user.name}</p></div></div>
     <div class="message"><small>11</small></div></a> `
  });
}) */
close.addEventListener("click", () => {
  document.querySelector(".modal").style.display = "none";
});
