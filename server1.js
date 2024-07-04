//set required packages/depencies
const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const {check, validationResult} = require('express-validator');
const fileUpload = require('express-fileupload');
const { error } = require('console');

//set the engine to ejs
app.set('view engine', 'ejs');
//identify the location of the static pages
app.set('views',path.join(__dirname,'views'));
app.use(express.static(__dirname +'/public'));

//set parser
app.use(express.urlencoded()); 

// set up session
app.use(session({
    secret: 'superrandomsecret',
    resave: false,
    saveUninitialized: true
}));

//set up for file upload
app.use(fileUpload());

//create connection to mongoDB 
mongoose.connect('mongodb://localhost:27017/projdemo').then(
    function(){console.log('DB connected successfully')}
).catch(function(err){
    console.log(err)
}); 

//create database model for admin login
const Admin = mongoose.model('Admin',
{
    username: String,
    password: String
}
);

//create database model for blogpost
const Post = mongoose.model('Post',
{
    title: String,
    image: String,
    content: String
}
);

//create default admin user if there is none
Admin.findOne({}).exec().then(
    function(data){
        if(data){
            console.log('Admin user already exists');
        } else {
            var user1 = {
                username: 'admin1',
                password: 'adminpass'
            }
            var newUser = new Admin(user1);
            newUser.save();
            console.log('New admin user is added');
        }
    } 
).catch();


//render landing page 
app.get('/',function(req,res){
    Post.find({}).exec().then(
        function(posts){
            res.render('bloghome',{posts:posts});
        }
    ).catch();
    
});

//fetching a post and displaying
app.get('/blogpost/:id',function(req,res){
    Post.find({}).exec().then( //fetch all records for navigation
        function(posts){
            if (posts){
                var id = req.params.id;
            Post.findOne({_id: id}).exec().then( //fetch record for specific post
            function(data){
                if(data){
                console.log(data);
                res.render('blogpost',{
                    posts: posts,
                    data: data});
            }
        }
    ).catch(
        function(err){
            console.log(err);
        }
    );
            }
        }
    ).catch();
});

//render login page after clicking login link 
app.get('/login',function(req,res){
    Post.find({}).exec().then(
        function(posts){
            res.render('login',{posts:posts});
        }
    ).catch();
    
});

//render admin homepage after successful login
app.post('/adminwelcome', function(req, res){

    var user = req.body.username;
    var pass = req.body.password;
   
    Admin.findOne({username:user, password:pass}).exec().then(
        function(admin){
        console.log('Admin: ' + admin);
            if (admin) { //user exists in db
                //store username in session and set logged in true
                req.session.username = admin.username;
                req.session.userLoggedIn = true;
                // render Admin welcome page
                res.render('adminwelcome', {admin});
            } else {
                Post.find({}).exec().then(
                    function(posts){
                    res.render('login', {
                        posts: posts,
                        msg:'Incorrect username and/or password'}); 
                    });
            }          
            }           
    ).catch(
        function(err){console.log(err);}
    );
    
})

//render add page
app.get('/addpage',function(req,res){
    // check if the user is logged in
   if(req.session.userLoggedIn){
    res.render('addpage');
   } else
   Post.find({}).exec().then(
    function(posts){
        res.redirect('login',{posts:posts});
    }
    ).catch();
});

//add new page
app.post('/addsuccess',[
    //validate post fields are not empty and throw error message if there are
    check('title', 'Please enter a title').not().isEmpty(),
    check('content', 'Please enter content').not().isEmpty()
], function(req,res){
    if(req.session.userLoggedIn){
    
    const errors = validationResult(req);
    console.log(errors);
    //display error in Add page 
    if (!errors.isEmpty()){
        res.render('addpage',{errors:errors.array()});
    } else

        //get values of text fields
        var title = req.body.title;
        var content = req.body.content;

        //set file variables and move to upload folder 
        var imageName = req.files.image.name;
        var imageFile = req.files.image;
        var imagePath = 'public/uploads/' + imageName;
        imageFile.mv(imagePath, function(err){
            console.log(err);
        })

        //create object with fetched data
        var pageData = {
            title:title,
            image:imageName,
            content:content
            
        }

        //save data to database
        var myPost = new Post(pageData);
        myPost.save();

        //show add page successful
        res.render('addsuccess');

} else
{
    Post.find({}).exec().then(
        function(posts){
            res.redirect('login',{posts:posts});
        }
    ).catch();
   }
});

//render edit page 
app.get('/editpages',function(req,res){
    if(req.session.userLoggedIn){
    Post.find({}).exec().then(
        function(post){
        res.render('editpages',{post:post});
        });
    } else
    Post.find({}).exec().then(
        function(posts){
            res.redirect('login',{posts:posts});
        }
    ).catch();
});

//render page that needs to be updated 
app.get('/editpage/:id',function(req,res){
    if(req.session.userLoggedIn){
    Post.findOne({_id: req.params.id}).exec().then(
        function(post){
            if(post){
            console.log(post);
            res.render('editpage',{post});
            }
        }
    ).catch(
        function(err){
            console.log(err);
        }
    );
    } else
    Post.find({}).exec().then(
        function(posts){
            res.redirect('login',{posts:posts});
        }
    ).catch();
});

//update a blog post and save to database
app.post('/editsuccess', function(req,res){
    if(req.session.userLoggedIn){
        var id = req.body.id;
        var title = req.body.title;
        var content = req.body.content;
        var image = req.files.image.name;
        var imageFile = req.files.image;
        var imagePath = 'public/uploads/' + image;
        imageFile.mv(imagePath);
        Post.findOne({_id: id}).exec().then(
            function(data){
                if (data){
                    data.title = title;
                    data.image = image;
                    data.content = content;
                    data.save();
                    res.render('editsuccess');
                }
            }
        ).catch();
      
} else
{
    Post.find({}).exec().then(
        function(posts){
            res.redirect('login',{posts:posts});
        }
    ).catch();
   }
});

//delete a page
app.get('/delete/:id',function(req,res){
    if(req.session.userLoggedIn){
        Post.findByIdAndDelete({_id:req.params.id}).exec().then(
            function(data){
                if (data){
                console.log('post deleted');  
                res.render('delete');
                }
            }
        ).catch(
            function(err){
                console.log(err);
            }
        );
    } else
    Post.find({}).exec().then(
        function(posts){
            res.redirect('login',{posts:posts});
        }
    ).catch();
});

//render logout successful page 
app.get('/logout',function(req,res){
    Post.find({}).exec().then(
        function(posts){
            req.session.destroy();
            res.render('logout',{posts:posts});
        }
    ).catch();
});

app.listen(2300, function(){
    console.log('Listening to port 2300');
});