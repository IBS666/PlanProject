using Microsoft.AspNetCore.Mvc;
using planProject.Services.Interfaces;

namespace planProject.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TaskController : ControllerBase
    {
        private readonly IProjectTaskService _taskService;

        public TaskController(IProjectTaskService taskService)
        {
            _taskService = taskService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateTask([FromBody] CreateTaskDto request)
        {
            var userId = int.Parse(User.FindFirst("userId")!.Value);
            var task = await _taskService.CreateTaskAsync(request, userId);
            return Ok(task);
        }

        [HttpPut("{taskId}")]
        public async Task<IActionResult> UpdateTask(int taskId, [FromBody] UpdateTaskDto request)
        {
            var userId = int.Parse(User.FindFirst("userId")!.Value);
            var result = await _taskService.UpdateTaskAsync(taskId, userId, request);

            if (result == "Task not found") return NotFound(new { message = result });
            return Ok(new { message = result });
        }

        [HttpDelete("{taskId}")]
        public async Task<IActionResult> DeleteTask(int taskId)
        {
            var userId = int.Parse(User.FindFirst("userId")!.Value);
            var result = await _taskService.DeleteTaskAsync(taskId, userId);

            if (result == "Task not found") return NotFound(new { message = result });
            return Ok(new { message = result });
        }

        [HttpPatch("{taskId}/status")]
        public async Task<IActionResult> UpdateTaskStatus(int taskId, [FromBody] UpdateTaskStatusDto request)
        {
            var userId = int.Parse(User.FindFirst("userId")!.Value);
            var result = await _taskService.UpdateTaskStatusAsync(taskId, userId, request.Status);

            if (result == "Task not found") return NotFound(new { message = result });
            return Ok(new { message = result });
        }

        [HttpGet("my-tasks")]
        public async Task<IActionResult> GetMyTasks()
        {
            var userId = int.Parse(User.FindFirst("userId")!.Value);
            var tasks = await _taskService.GetUserTasksAsync(userId);
            return Ok(tasks);
        }

        [HttpGet("project/{projectId}")]
        public async Task<IActionResult> GetProjectTasks(int projectId)
        {
            var tasks = await _taskService.GetProjectTasksAsync(projectId);
            return Ok(tasks);
        }
    }
}