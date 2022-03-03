//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const md5 = require("md5");
const session = require('express-session');
const multer = require('multer');
const passport = require("passport");
const fs = require('fs');
const path = require('path');
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb+srv://jai:jai1234@cluster0.g9wlf.mongodb.ne/blogDB", {useNewUrlParser: true});
mongoose.set("useCreateIndex",true);
const userSchema=new mongoose.Schema({
  username:String,
  password:String,
  googleId:String,
 
});
const postSchema = new mongoose.Schema({
  title: String,
  content: String,
   img:String
},{
  timestamps : true,
});
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, './public/uploads/image');
  },
  filename: (req, file, cb) => {
      cb(null, Date.now()+file.originalname);
  }
});

const upload = multer({ storage: storage,
  limits:{
fieldSize:1024*1024*3
  }
 });
// var imgModel = require('./model');
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User= mongoose.model("User",userSchema);
const Post =mongoose.model("Post", postSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID:process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  // callbackURL: "https://obscure-tor-09166.herokuapp.com/auth/google/home",
  userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));
app.get("/",function(req,res){
  res.render("opening");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['email'] }));

  app.get('/auth/google/home', 
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/home');
  });


  app.get("/home", async function(req, res){
   
   const post = await Post.find().sort({'_id': -1})
   console.log("posts", post)
   res.render("home", {
     posts: post
   });
  //  Post.find().sort( { 'timestamps': -1 } ).limit(10)  
  });

app.get("/login", function(req, res){
  res.render("opening");
});

app.get("/register", function(req, res){
  res.render("register");
});


app.get("/compose",function(req,res){
  if(req.isAuthenticated()){
    res.render("compose");
  }else{
    res.redirect("/");
  }
});
app.post("/compose",upload.single('image'),function(req,res){
  console.log(req.file);
  
  const post = new Post({
    title: req.body.postTitle,
    content:req.body.postBody,
   
     img: req.file?.filename || ''
  });

  post.save(function(err){
    if (!err){
        res.redirect("/home");
    }
  });
});
app.get("/posts/:postId", function(req, res){

  const requestedPostId = req.params.postId;

    Post.findOne({_id: requestedPostId}, function(err, post){
      res.render("post", {
         title: post?.title || '',
        content: post?.content || '',
        img:post?.img || ''
      });

    });
  
  });
app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});
app.post("/register",function(req,res){

User.register({username:req.body.username},req.body.password,function(err,user){
  if(err ){
    console.log(err);
    
  }else{
    passport.authenticate("local")(req,res,function(){
      res.redirect("/home");
    });
  }
});
});
app.post("/login",function(req,res){
  
  const user= new User({
    username:req.body.username,
    password:req.body.password
  });
req.login(user,function(err){
  if(err){
    console.log(err);
  }
  else{
    passport.authenticate("local")(req,res,function(){
      res.redirect("/home");
    });
  }

  });
 });


app.get("/about", function(req, res){
  res.render("about", {aboutContent: aboutContent});
});

app.get("/contact", function(req, res){
  res.render("contact");
});

let port = process.env.PORT;
if (port == null || port == ""){
  port = 3000;
}
app.listen(port);

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
