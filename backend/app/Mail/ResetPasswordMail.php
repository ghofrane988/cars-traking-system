<?php

namespace App\Mail;

use App\Models\Employee;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ResetPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public $employee;
    public $token;
    public $resetUrl;

    public function __construct(Employee $employee, $token)
    {
        $this->employee = $employee;
        $this->token = $token;
        // Assume frontend runs on port 4200 and has a /reset-password route
        $this->resetUrl = "http://localhost:4200/reset-password?token={$token}&email={$employee->email}";
    }

    public function build()
    {
        return $this->subject('Réinitialisation de votre mot de passe')
            ->html("
                        <h2>Bonjour {$this->employee->nom},</h2>
                        <p>Vous recevez cet email car nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.</p>
                        <p>Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe :</p>
                        <p><a href=\"{$this->resetUrl}\" style=\"background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;\">Réinitialiser le mot de passe</a></p>
                        <p>Si vous n'avez pas demandé cette réinitialisation, aucune action supplémentaire n'est requise.</p>
                        <br>
                        <p>Merci,</p>
                        <p>L'équipe FleetCommand</p>
                    ");
    }
}