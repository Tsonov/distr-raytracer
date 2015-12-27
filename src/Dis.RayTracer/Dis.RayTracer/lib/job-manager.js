
module.exports = exports = JobStore;

function JobStore(jobs) {
    if (!(this instanceof JobStore))
        return new JobStore();
    
    this.pendingJobs = jobs.slice(0);
    console.log(JSON.stringify(this.pendingJobs));
    console.log(this.pendingJobs.length);
    this.results = [];
    this.expectedJobsToFinish = this.pendingJobs.length;
}

JobStore.prototype.workDone = function () {
    return this.results.length === this.expectedJobsToFinish;
};

JobStore.prototype.hasWork = function () {
    return this.pendingJobs.length > 0;
}

JobStore.prototype.getWork = function () {
    if (!(this.hasWork())) {
        throw "No work left, can't get more.";
    }
    return this.pendingJobs.pop();
}

JobStore.prototype.jobDone = function (result) {
    this.results.push(result);
}

JobStore.prototype.pendingJobCount = function () {
    return this.pendingJobs.length;
}

JobStore.prototype.resultsReceived = function () {
    return this.results.length;
}