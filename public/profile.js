
const nameCancel = document.querySelector('#namecancel');
const nameDone = document.querySelector('#namedone');


const phoneCancel = document.querySelector('#phonecancel');
const phoneDone = document.querySelector('#phonedone');

const emailCancel = document.querySelector('#emailcancel');
const emailDone = document.querySelector('#emaildone');

const descCancel = document.querySelector('#desccancel');
const descDone = document.querySelector('#descdone');

//const chatCancel = document.querySelector('#chatcancel');
//const chatDone = document.querySelector('#chatdone');

const anonymousCancel = document.querySelector('#anonymouscancel');
const anonymousDone = document.querySelector('#anonymousdone');



nameCancel.addEventListener('click',()=>{
   document.querySelector('#name').disabled=true;
   document.querySelector('#nameedit').style.display='inline-block'
    nameCancel.style.display="none";
    nameDone.style.display="none";
})
descCancel.addEventListener('click',()=>{
   document.querySelector('#desc').disabled=true;
   document.querySelector('#descedit').style.display='inline-block'
    descCancel.style.display="none";
    descDone.style.display="none";
})
emailCancel.addEventListener('click',()=>{
   document.querySelector('#email').disabled=true;
   document.querySelector('#emailedit').style.display='inline-block'
    emailCancel.style.display="none";
    emailDone.style.display="none";
})
phoneCancel.addEventListener('click',()=>{
   document.querySelector('#phone').disabled=true;
   document.querySelector('#phoneedit').style.display='inline-block'
    phoneCancel.style.display="none";
    phoneDone.style.display="none";
})
/*chatCancel.addEventListener('click',()=>{
    $('#declined').css('display','none')
   document.querySelector('#chat').disabled=true;
   document.querySelector('#chatedit').style.display='inline-block'
    chatCancel.style.display="none";
    chatDone.style.display="none";
})*/
anonymousCancel.addEventListener('click',()=>{
   document.querySelector('#anonymous').disabled=true;
   document.querySelector('#anonymousedit').style.display='inline-block'
    anonymousCancel.style.display="none";
    anonymousDone.style.display="none";
})
