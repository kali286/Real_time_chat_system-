Hello {{ $user->name }},

@if ($user->blocked_at)
Your account has been blocked. You are no longer able to log in.
@else
Your account has been activated. You can now log in.
@endif

If the button in the HTML email does not work, copy and paste this URL into your browser:

{{ route('auth.clear_and_login', ['next' => route('login')]) }}

Thank you,
{{ config('app.name') }}
