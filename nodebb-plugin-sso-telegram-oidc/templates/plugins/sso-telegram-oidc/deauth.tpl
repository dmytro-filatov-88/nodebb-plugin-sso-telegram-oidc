<div class="row">
	<div class="col-xs-12 col-md-8 offset-md-2">
		<div class="card card-body bg-light my-5 p-4">
			<h2 class="card-title text-danger mb-4">Disconnect {service}</h2>
			<p class="card-text mb-4">
				Are you sure you want to disconnect your forum account from your <strong>{service}</strong> account?
			</p>
			<p class="card-text text-muted mb-4">
				Once disconnected, you will no longer be able to log in to this forum using your Telegram account unless you link them again.
			</p>
			<form method="post">
				<input type="hidden" name="_csrf" value="{config.csrf_token}">
				<div class="d-flex justify-content-between">
					<a href="{config.relative_path}/me/edit" class="btn btn-light">Cancel</a>
					<button type="submit" class="btn btn-danger">Disconnect {service}</button>
				</div>
			</form>
		</div>
	</div>
</div>
