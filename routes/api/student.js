const express = require("express");
const bodyParser = require("body-parser");
const auth = require("../../middleware/authstudent");
const Student = require("../../models/Student");
const Teacher = require("../../models/Teacher");
const SuperUser = require("../../models/SuperUser");
const Counsell = require("../../models/Counsell");
const Meeting = require("../../models/Meeting");
const Discussion = require("../../models/Discussion");
const schedule = require("node-schedule");
const { route } = require("./teacher");
const nodemailer=require("nodemailer");
const moment = require("moment");
const router = express.Router();
const quesTime = 20000;
router.use(bodyParser.urlencoded({ extended: true }));

//Setting up Tranporter

const transporter = nodemailer.createTransport({
    service:'gmail', 
    auth:{
        user:'eduon.portal@gmail.com',
        pass:'lav1234@'
    }  
});

router.get("/dashboard",auth,(req,res)=>{

    const scheduledcounsells=[],pastcounsells=[];
    Counsell.find({},async(err,arr)=>{
        
        if(err){
            throw Error(err);
        }

        const yours=[];

        await arr.forEach((x)=>{
            if((new Date()).getTime() <=x.scheduledTime.getTime() && x.reserved==false){
               scheduledcounsells.push(x);
            }else{
               pastcounsells.push(x);
            }
        });

        await arr.forEach((x)=>{
          if(x.studentemail == req.user.email){
              yours.push(x);
          }
        });

        let errors=[];

        if(req.query.f==0){
            errors.push("You are not allowed to enter discussion room or room does not exist");
        }else if(req.query.f==2){
            errors.push("User does not exist");
        }

        res.render("studentdashboard",{currentUser:req.user,
                                       clientType:req.session.client,
                                       errors:errors,
                                       scheduledcounsells,
                                       pastcounsells,
                                       yours:yours});
    });
});  




///////////////////////////////////////////////
            //Discusson Routes
///////////////////////////////////////////////


router.get("/dashboard/discussion/enter",auth,async(req,res)=>{

    Discussion.findOne({roomId:req.query.room},async (err,discussion)=>{
        if(err || !discussion){
            res.redirect("/student/dashboard?f=0");
        }
        if(discussion.students.findIndex(x=>x.email === req.query.user)===-1){
            res.redirect("/student/dashboard?f=0");
        }else{
            let errors=[];
            if(req.query.v==0){
              errors.push("Class has not started yet . Come at Scheduled Time");
            }
            res.render("studentdiscussionroom",{currentUser:req.user,clientType:req.session.client,discussion:discussion,texts:discussion.texts,errors:errors});
        }
    });

});

router.get("/dashboard/discussion/enter/classroom",async(req,res)=>{

    Discussion.findOne({roomId:req.query.room},(err,discussion)=>{
        if(err){
            throw Error(err);
        }
        if(discussion.students.findIndex(x=>x.email === req.query.email)===-1){
         res.redirect('/student/dashboard/discussion/enter?room'+req.params.room+'&user='+req.params.email+"&v=0");
        }else if((new Date()).getTime() < discussion.scheduledTime.getTime()){
            console.log("Class has not started yet . Come at Scheduled Time");
            res.redirect("/student/dashboard/discussion/enter?room="+req.query.room+"&user="+req.query.email+"&v=0")
        }else {
            res.render("studentmainclassroom",{currentUser:req.user,clientType:req.session.client,discussion:discussion})
        }
    });

});

////////////////////////////////////////
 //Searching any student
///////////////////////////////////////
router.get("/profile/friend",auth,(req,res)=>{
   
    Student.findOne({email:req.query.email},(err,student)=>{
        if(student){
            Discussion.find({},async(err,discussions)=>{
                Meeting.find({},async(err,meetings)=>{
                    if(err){
                        throw Error(err);
                    }

                let attendance=[],graph=[];
    
                    let c=0;
                    await discussions.forEach(async (discussion)=>{
                        let y=discussion.students.findIndex(x => x.email == req.query.email);
                        if(y!==-1){
                            attendance.push(discussion);
                            if(discussion.students[y].present === true){
                                c=c+1;
                            }
                        }
                    });
                    
                    await meetings.forEach(async (meeting)=>{
                        let y = meeting.students.indexOf(req.query.email);
                        if(y!==-1){
                            graph.push(meeting);
                        }
                    });
                    
                    let test=[];
                    await graph.forEach(async(g)=>{
                        let x={
                        scheduledTime:g.scheduledTime,
                        roomId:g.roomId,
                        totalquestions:g.questions.length,
                        }
                    let y= g.intestdetails.findIndex(z=> z.email == req.query.email);
                    let count =0;
                    await g.intestdetails[y].correct.forEach((ee)=>{
                        if(ee==1){
                            count++;
                        }
                    });
                    x.correct = count;
                    x.percentage = (count/(x.totalquestions)*(1.0))*100;
                    test.push(x);
                    });
                    
    
                    let present=[];
                    await attendance.forEach((at)=>{
                        let x={
                            scheduledTime:at.scheduledTime,
                            roomId:at.roomId,
                        }
                        let y=at.students.findIndex(z => z.email ==req.query.email);
                        if(at.students[y].present ==true){
                        x.present=true;
                        }else{
                        x.present=false;
                        }
                        present.push(x);
                    });
                
                let totalpercentagepresent= (c/(attendance.length)*(1.0))*100;
                res.render("friendprofile",{
                    currentUser:req.user,
                    clientType:req.session.client,
                    friendDetails:student,
                    present:present,
                    test:test,
                    totalpercentagepresentinclass:totalpercentagepresent
                }); 
                });
            });
     }else{
         res.redirect("/student/dashboard?f=2");
     }
    });

 });


 router.get("/profile/myprofile",auth,(req,res)=>{
   
    Student.findOne({email:req.query.email},(err,student)=>{
        if(student){
 
         Discussion.find({},async(err,discussions)=>{
             Meeting.find({},async(err,meetings)=>{
 
                 if(err){
                     throw Error(err);
                 }
 
                 let attendance=[],graph=[];
 
                 let c=0;
                     await discussions.forEach(async (discussion)=>{
                         let y=discussion.students.findIndex(x => x.email == req.query.email);
                         if(y!==-1){
                             attendance.push(discussion);
                             if(discussion.students[y].present === true){
                                 c=c+1;
                             }
                         }
                     });
                 
                     await meetings.forEach(async (meeting)=>{
                         let y = meeting.students.indexOf(req.query.email);
                         if(y!==-1){
                             graph.push(meeting);
                         }
                     });
                     
                 let test=[];
 
                 await graph.forEach(async(g)=>{
                     let x={
                         scheduledTime:g.scheduledTime,
                         roomId:g.roomId,
                         totalquestions:g.questions.length,
                     }
                     let y= g.intestdetails.findIndex(z=> z.email == req.query.email);
                     let count =0;
                     await g.intestdetails[y].correct.forEach((ee)=>{
                         if(ee==1){
                             count++;
                         }
                     });
                     x.correct = count;
                     x.percentage = (count/(x.totalquestions)*(1.0))*100;
                     test.push(x);
                 });
                 
 
                 let present=[];
                 await attendance.forEach((at)=>{
                     let x={
                         scheduledTime:at.scheduledTime,
                         roomId:at.roomId,
                     }
                     let y=at.students.findIndex(z => z.email ==req.query.email);
                     if(at.students[y].present ==true){
                         x.present=true;
                     }else{
                         x.present=false;
                     }
                     present.push(x);
                 });
                 
                 let totalpercentagepresent= (c/(attendance.length)*(1.0))*100;
  
                 res.render("studentprofile",{
                         currentUser:req.user,
                         clientType:req.session.client,
                         present:present,
                         test:test,
                         totalpercentagepresentinclass:totalpercentagepresent});
             });
         });
 
      }else{
          res.redirect("/student/dashboard?f=2");
      }
    });
    
 });

module.exports = router;
