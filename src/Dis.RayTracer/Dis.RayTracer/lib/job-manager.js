
module.exports = exports = JobStore;

function JobStore(jobs) {
    if (!(this instanceof JobStore))
        return new JobStore();
    
    this.pendingJobs = jobs.slice(0);
    this.jobsInProgress = [];
    console.log(JSON.stringify(this.pendingJobs));
    console.log(this.pendingJobs.length);
    this.results = [];
    this.expectedJobsToFinish = this.pendingJobs.length;
}

JobStore.prototype.workDone = function () {
    return this.results.length === this.expectedJobsToFinish;
};

JobStore.prototype.hasWork = function () {
    return this.pendingJobs.length > 0 || this.jobsInProgress.length > 0;
}

JobStore.prototype.getWork = function () {
    var result;

    if (!(this.hasWork())) {
        throw "No work left, can't get more.";
    }
    if (this.pendingJobs.length > 0) {
        // Give a proper job if one's available
        result = this.pendingJobs.pop();
        this.jobsInProgress.push(result);
    } else {
        // All jobs have been distributed
        // Hand over a long-running job in progress since we might have a slowpoke worker
        // Take the first job and put it back as last to avoid giving it a lot of times
        result = this.jobsInProgress.shift();
        this.jobsInProgress.push(result);
    }

    return result;
}

JobStore.prototype.jobDone = function (result) {
    var job,
        ixQueue,
        alreadyCompleted;

    // Do a check if a job was completed twice by multiple workers
    alreadyCompleted = this.results.some(function (element) {
        return element.dx === result.dx &&
               element.dy === result.dy; 
    });
    if (alreadyCompleted) {
        return false;
    }
    
    ixQueue = this.jobsInProgress.findIndex(function (element) {
        // Assume that same starting point is the same job since they should be unique
        return element.dx === result.dx &&
               element.dy === result.dy;
    })
    if (ixQueue !== -1) {
        job = this.jobsInProgress.splice(ixQueue, 1)[0];
        this.results.push(job);
        return true;
    } else {
        throw "Somehow a job does not exist in the in progress queue...";
    }
    
}

JobStore.prototype.pendingJobCount = function () {
    return this.pendingJobs.length;
}

JobStore.prototype.resultsReceived = function () {
    return this.results.length;
}