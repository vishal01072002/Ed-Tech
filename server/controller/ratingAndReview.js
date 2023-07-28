const RatingAndReview = require("../model/RatingAndReview");
const User = require("../model/User");
const Course = require("../model/Course");
const { default: mongoose, Aggregate } = require("mongoose");

// create rating
exports.createRating = async(req,res)=>{
    try {

        // fetch data
        const {rating,review,courseId} = req.body;
        const userId = req.user.id;

        // validate data
        if(!rating || !review || !courseId || !userId) {
            res.status(401).json({
                sucess: false,
                message: "Please fill all details in rating",
            });
        }

        // check user is enrolled in course or not
        const course = await Course.findOne({courseId,
                                           studentEnrolled: {
                                            $selectMatch: {$eq :userId}
                                           }} );

        if(course){
            res.status(401).json({
                sucess: false,
                message: "student is not enrolled in course",
            });
        }
        /*
        if(!course.studentEnrolled.includes(userId)){
            res.status(401).json({
                sucess: false,
                message: "student is not enrolled in course",
            });
        }
        */

        // only 1 rating is allow check not try to do another
        const alreadyReviewed = await RatingAndReview.findOne({user:userId ,course:courseId});

        if(alreadyReviewed){
            res.status(401).json({
                sucess: false,
                message: "You alreadey give the rating",
            });
        }

        // create entry in DB
        const newRating = (await RatingAndReview.create({user:userId,course:courseId,rating,review})).populate(["user", "course"]).exec();

        // add in course rating 
        const addRatingCourse = await Course.findByIdAndUpdate(courseId,{
            $push:{
                ratingAndReview : newRating._id,
            },
        })
        res.status(200).json({
            sucess: true,
            body:newRating,
            message: "Rating created sucessfully",
        });

    } catch (error) {
        res.status(500).json({
            sucess: false,
            message: "something went wrong while Rating to course",
            error,
        });
    }
}

// return average rating
exports.avergeRating = async(req,res)=>{
    try {
        // validate data
        const {courseId} = req.body;

        // validate data
        if(!courseId ) {
            res.status(401).json({
                sucess: false,
                message: "Please fill course details valid",
            });
        }

        // aisi rating jiski course id ye ho
        const result = await RatingAndReview.aggregate([
            {
                $match:{
                    course: new mongoose.Types.ObjectId(courseId),
                },
            },
            {
                $group:{
                    _id:null,
                    averageRating: {$avg : "$rating"},
                },
            },
        ])
        
        let avgRating ;
        if(result.length > 0){
            avgRating = result[0].averageRating;
        }
        else{
            // no one rated yet
            avgRating = 0;
        }
        /*
        const allRating = await RatingAndReview.find({course:courseId}).populate(["user", "course"]).exec();

        let sum = 0;
        allRating.map( (oneReview)=> {
            sum = sum + oneReview.rating
        });

        let student = allRating.length();
        let avgRating = sum/student;
        */

        res.status(200).json({
            sucess: true,
            body:allRating,
            average: avgRating,
            message: "Rating fetched sucessfully",
        });

    } catch (error) {
        res.status(500).json({
            sucess: false,
            message: "something went wrong while fetching all Rating",
            error,
        });
    }
}


// get all rating
exports.getAllRating = async(req,res)=>{
    try {

        // validate data
        const {courseId} = req.body;

        // validate data
        if(!courseId ) {
            res.status(401).json({
                sucess: false,
                message: "Please fill course details valid",
            });
        }

        // only want specific data of user
        const allRating = await RatingAndReview.find({course:courseId})
        .sort({rating : "desc"})
        .populate({
            path: "user",
            select: "firstName LastName email image"
        })
        .populate({
            path: "course",
            select: "courseName"
        }).exec();


        //.populate(["user", "course"]).exec();;

        res.status(200).json({
            sucess: true,
            body:allRating,
            message: "Rating fetched sucessfully",
        });

    } catch (error) {
        res.status(500).json({
            sucess: false,
            message: "something went wrong while fetching all Rating",
            error,
        });
    }
}
